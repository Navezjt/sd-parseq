import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import Dexie, { Table } from 'dexie';
import { useLiveQuery } from "dexie-react-hooks";
import equal from 'fast-deep-equal';
import TimeAgo from 'javascript-time-ago';
import debounce from 'lodash.debounce';
import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReactTimeAgo from 'react-time-ago';
//import {PasteClient, ExpireDate, Publicity} from "pastebin-api";
import { v4 as uuidv4 } from 'uuid';
import { generateDocName } from './doc-name-generator';

export class ParseqDexie extends Dexie {
    parseqVersions!: Table<ParseqDocVersion>;
    parseqDocs!: Table<ParseqDoc>;
    globalConfig!: Table<{key: string, value: string, timestamp: number}>;

    constructor() {
        super('parseqDB');
        this.version(2).stores({
            parseqVersions: 'versionId, docId, timestamp',
            parseqDocs: 'docId, name',
            globalConfig: 'key, value, timestamp'
        });
    }
}
export const db = new ParseqDexie();
const MAX_DOCS = 100; // Number of docs to store
const MAX_VERSIONS = 25; // Number of historical versions of doc to store

export const makeDocId = (): DocId => "doc-" + uuidv4() as DocId
const makeVersionId = (): VersionId => "version-" + uuidv4() as VersionId

export const loadVersion = async (docId: DocId, versionId?:VersionId): Promise<ParseqDocVersion | undefined> => {
    if (versionId) {
        // Load a specific version of doc.
        // Verion IDs are globally unique, so we can just lookup by the versionId (no need to check docId).
        return db.parseqVersions.get(versionId);
    } else {
        // Load latest version of doc
        const versions = await db.parseqVersions.where('docId').equals(docId).reverse().sortBy('timestamp');
        if (versions.length > 0) {
            return versions[0];
        }
    }
}

export const saveVersion = async (docId: DocId, content: ParseqPersistableState) => {
    //Deep-compare content to previous version so we don't save consecutive identical versions.
    const lastVersion = await loadVersion(docId);
    const document = await db.parseqDocs.get(docId);
    if (lastVersion 
        && Object.keys(content)
            .filter((k) => k !== 'meta') // exclude this field because it has a timestamp that is expected to change.
            .every((k) => equal(content[k as keyof ParseqPersistableState], lastVersion[k as keyof ParseqPersistableState]))) {
        //log.debug("Not saving, would be identical to previous version.");
    } else {
        content.meta.docName = document?.name ?? "Untitled";
        const version: ParseqDocVersion = {
            docId: docId,
            versionId: makeVersionId(),
            timestamp: Date.now(),
            ...content
        }    
        //log.debug("Saving...");
        return db.parseqVersions.add(version, version.versionId);
    }
    
}

type MyProps = {
    docId: DocId;
    onLoadContent: (latestVersion?: ParseqDocVersion) => void;
};

// TODO: separate React UI component from the service class.
export function DocManagerUI({ docId, onLoadContent }: MyProps) { 

    const [openRevertDialog, setOpenRevertDialog] = useState(false);
    const [selectedVersionIdForRevert, setSelectedVersionIdForRevert] = useState<VersionId>();
    const [openLoadDialog, setOpenLoadDialog] = useState(false);
    const [selectedDocIdForLoad, setSelectedDocIdForLoad] = useState<DocId>();
    const [dataToImport, setDataToImport] = useState("");
    const [importError, setImportError] = useState("");
    const [openShareDialog, setOpenShareDialog] = useState(false);
    const [lastModified, setLastModified] = useState(0);
    const [activeDoc, setActiveDoc] = useState({docId : docId, name: "loading"} as ParseqDoc);
    const [exportableDoc, setExportableDoc] = useState("");
    const [pastebinUrl, setPastebinUrl] = useState("");
    const [parseqPastebinUrl, setParseqPastebinUrl] = useState("");
    const [pastebinDevKey, setPastebinDevKey] = useState("");
    const [uploadStatus, setUploadStatus] = useState(<></>);

    const activeDocSetter = useLiveQuery(
        async () => {
            const doc = await db.parseqDocs.get(docId)
            if (doc) {
                console.log(`Doc ${docId} loaded: `, doc);
                setActiveDoc(doc);
                return doc;
            } else {
                let newDoc = { name: generateDocName(), docId: docId };
                console.log(`Creating new ${docId}: `, newDoc);                
                await db.parseqDocs.put(newDoc, docId);
                setActiveDoc(newDoc);
                return newDoc;
            }
        }, [docId]);

    const pastebinDevKeyRetriver = useLiveQuery(
        async () => {
            const pastebinDevKeyCandidate = await db.globalConfig.get('pastebinDevKey')
            if (pastebinDevKeyCandidate) {
                setPastebinDevKey(pastebinDevKeyCandidate.value);
            }
        }, []);

    const docVersions = useLiveQuery(
        async () => {
            if (activeDoc) {
                const versions = await db.parseqVersions.where('docId').equals(activeDoc.docId).reverse().sortBy('timestamp');
                versions && versions.length > 0 && setLastModified(versions[0].timestamp);
                return versions;
            } else {
                return [];
            }
        },
        [activeDoc]
    );
    const allDocsWithInfo = useLiveQuery(
        async () => {
            const alldocs = await db.parseqDocs.toArray();
            return Promise.all(alldocs.map(async (doc) => {
                const versions = await db.parseqVersions.where('docId').equals(doc.docId).reverse().sortBy('timestamp');
                if (!versions || versions.length === 0) {
                    return undefined;
                }
                return {
                    ...doc,
                    lastModified: versions[0].timestamp,
                    versionCount: versions.length
                }
            }));
        }, []
    );

    const handleClickOpenRevertDialog = (): void => {
        setOpenRevertDialog(true);
    };
    const handleCloseRevertDialog = (e: any): void => {
        setOpenRevertDialog(false);
        if (e.target.id === "revert" && selectedVersionIdForRevert) {
            loadVersion(activeDoc.docId, selectedVersionIdForRevert).then((version) => {
                onLoadContent(version);
            });
        }  
    };
    const revertDialog = <Dialog open={openRevertDialog} onClose={handleCloseRevertDialog}>
        <DialogTitle>Revert to a previous version</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Revert to the version of <strong>{activeDoc?.name}</strong> saved at...:
            </DialogContentText>
            <TextField style={{ marginTop: 20 }}
                id="doc-history"
                select
                label="History"
                value={selectedVersionIdForRevert}
                onChange={(e) => setSelectedVersionIdForRevert(e.target.value as VersionId)}
                SelectProps={{ native: true, style: {fontSize: "0.75em"} }}
                >
                {
                    docVersions?.map((version: ParseqDocVersion) => (
                        <option key={version.timestamp} value={version.versionId}>
                            {new Date(version.timestamp).toISOString() + " (" + new TimeAgo("en-US").format(version.timestamp) + ")"}
                        </option>
                    ))
                }
            </TextField>
        </DialogContent>
        <DialogActions>
            <Button size="small" id="cancel_revert" onClick={handleCloseRevertDialog}>Cancel</Button>
            <Button size="small" variant="contained" id="revert" onClick={handleCloseRevertDialog}>Revert</Button>
        </DialogActions>
    </Dialog>

    const handleClickOpenLoadDialog = (): void => {
        setOpenLoadDialog(true);
    };
    
    // TODO break this into separate functions.
    const handleCloseLoadDialog = (e: any): void => {
        if (e.target.id === "load" && selectedDocIdForLoad) {
            navigateToDocId(selectedDocIdForLoad);
        } else if (e.target.id === "import" && dataToImport) {
            try {
                const dataToImport_parsed = JSON.parse(dataToImport);
                // Basic validation - we don't check every every keyframe,
                // so you can still pass in a corrupt Parseq doc and get odd behaviour.
                if (typeof dataToImport_parsed === "object"
                    && Array.isArray(dataToImport_parsed.keyframes) && dataToImport_parsed.keyframes.length >= 2
                    && typeof dataToImport_parsed.prompts === "object"
                    && typeof dataToImport_parsed.options === "object") {
                        
                        // If the user has pasted in a rendered doc, deleted the rendered frame data so we
                        // don't save it along with the keyframe data.
                        // Also delete any metadata we'll want to replace.
                        delete dataToImport_parsed.rendered_data;
                        delete dataToImport_parsed.docId;
                        delete dataToImport_parsed.versionId;
                        delete dataToImport_parsed.timestamp;
                    
                        const newDoc : ParseqDoc = {name: dataToImport_parsed?.meta?.docName || generateDocName(), docId: makeDocId() };
                        db.parseqDocs.add(newDoc).then(() => {
                            saveVersion(newDoc.docId, dataToImport_parsed).then(() => {
                                navigateToDocId(newDoc.docId);
                            });
                        });

                } else {
                    setImportError("This doesn't look like a Parseq document. Expected JSON object with at least fields: 'keyframes' (array), 'prompts' (object), and 'options' (object). Please check the data and try again.");
                }

            } catch (e : any) {
                setImportError(e.message);
            }
        } else if (e.target.id === "cancel_load") {
            setOpenLoadDialog(false);
        }
    };

    const loadDialog = <Dialog open={openLoadDialog} onClose={handleCloseLoadDialog}>
        <DialogTitle>Load a Parseq document</DialogTitle>
        <DialogContent>
        <Grid container>
            <Grid xs={12}>
                <DialogContentText>
                    Switch to a Parseq doc you were working on previously on this system:
                </DialogContentText>
            </Grid>
            <Grid xs={10}>
                <TextField
                    id="doc-load"
                    select
                    style={{ marginTop: 20, width: '100%' }}
                    label="Local storage"
                    value={selectedDocIdForLoad}
                    onChange={(e) => setSelectedDocIdForLoad(e.target.value as DocId)}
                    SelectProps={{ native: true, style: {fontSize: "0.75em"} }}
                    >
                    {
                        allDocsWithInfo?.sort((a:any,b:any) => {
                                if (a && b) {
                                return b.lastModified - a.lastModified;
                                } else if (a) {
                                    return -1;
                                } else if (b) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }).map((d) => (
                            d ? <option key={d.docId} value={d.docId}>
                                {d.name 
                                    + " (saves: " + d.versionCount.toString()
                                    + ", last saved: " + ((d.lastModified) ?  new TimeAgo("en-US").format(d.lastModified) + ")" : "never)")}
                            </option>
                            : <></>
                        ))
                    }
                </TextField>
            </Grid>
            <Grid xs={2} sx={{display: 'flex', justifyContent: 'right', alignItems: 'end'}}>
                <Button size="small" variant="contained" id="load" onClick={handleCloseLoadDialog}>Load</Button>
            </Grid>
            <Grid xs={12} style={{ marginTop: 40}}>
                <DialogContentText>
                    <strong>Or</strong> import a Parseq doc that has been shared with you:
                </DialogContentText>              
            </Grid>      
            <Grid xs={10}>
                <TextField
                style={{ width: '100%' }}
                id="doc-export"
                multiline
                onFocus={event => event.target.select()}
                rows={10}
                InputProps={{ style: { fontFamily: 'Monospace', fontSize: '0.75em' } }}
                placeholder="<Paste your Parseq doc here>"
                value={dataToImport}
                onChange={(e) => setDataToImport(e.target.value)}
                />
            </Grid>
            <Grid xs={2} sx={{display: 'flex', justifyContent: 'right', alignItems: 'end'}}>
                <Button size="small" variant="contained" id="import" onClick={handleCloseLoadDialog}>Import</Button>
            </Grid>
            <Grid xs={12}>
                {importError && <Alert severity="error" style={{ marginTop: 20 }}>{importError}</Alert>}
            </Grid>
        </Grid>
        </DialogContent>
        <DialogActions>
            <Button size="small" id="cancel_load" onClick={handleCloseLoadDialog}>Cancel</Button>
        </DialogActions>
    </Dialog>

const handleClickOpenShareDialog = (): void => {
    loadVersion(activeDoc.docId).then((version) => {
        setExportableDoc(JSON.stringify(version||"", null, 2));
        setOpenShareDialog(true);
    });

};
const handleCloseShareDialog = (e: any): void => {
    setOpenShareDialog(false);
};

const handleUploadToPastebin = async (e: any): Promise<void> => {
    console.log('in');
    if (!pastebinDevKey) {
        return;
    }
    setUploadStatus(<></>);
    
    // const client = new PasteClient(pastebinDevKey);


    fetch('https://cors.io/?https://pastebin.com/api/api_post.php',{
        method: "POST",
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({
            api_dev_key: pastebinDevKey,
            api_option: "paste",
            api_paste_code: exportableDoc,
            api_paste_name: activeDoc.name + " - Parseq - " + window.location.hostname,
            api_paste_private: 0,
            api_paste_format: "json",
        })
      }).then(res => {
        console.log("Request complete! response:", res);
        setPastebinUrl(res.url);
        setUploadStatus(<Alert severity="success">
                <p>Upload <a href={res.url}>successful</a>. Share the URL above to load it directly into Parseq on another system.</p>
            </Alert>);  
      }).catch(err => {
        console.log("Request failed", err);
        setUploadStatus(<Alert severity="error"><p>Upload failed: {err}</p></Alert>);
      });
}

const shareDialog = <Dialog open={openShareDialog} onClose={handleCloseShareDialog} maxWidth='lg'>
    <DialogTitle>Share your Parseq document</DialogTitle>
    <DialogContent>
    <Grid container>
        <Grid xs={12}>
        <DialogContentText marginBottom='10px'>
            Share your doc via Pastebin:
        </DialogContentText>
        </Grid>
        <Grid xs={3}>
            <TextField
                required={true}
                fullWidth={true}
                id="doc-pastebin-key"
                label="Pastebin dev key"
                placeholder="Your pastebin dev key"
                InputLabelProps={{shrink: true}}
                InputProps={{ style: { fontFamily: 'Monospace', fontSize: '0.75em' } }}
                value={pastebinDevKey}
                onChange={(e) => db.globalConfig.put({ key: 'pastebinDevKey', value: e.target.value, timestamp: Date.now() }) }
            />
        </Grid>
        <Grid xs={2} sx={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <Button disabled={!pastebinDevKey} size="small" id="copy_share" variant="contained"  onClick={handleUploadToPastebin} >Upload ➡️</Button>
        </Grid>
        <Grid xs={5}>
            <TextField
                fullWidth={true}
                id="doc-parseq-pastebin-url"
                label="Parseq URL"
                placeholder="(Enter your pastebin dev key and hit upload.)"
                InputLabelProps={{shrink: true}}
                InputProps={{  readOnly: true, style: { fontFamily: 'Monospace', fontSize: '0.75em' } }}
                value={parseqPastebinUrl}
                variant="filled"
            />
        </Grid>
        <Grid xs={2} sx={{display: 'flex', justifyContent: 'right', alignItems: 'start'}}>
            <CopyToClipboard text={parseqPastebinUrl}>
                <Button disabled={typeof parseqPastebinUrl === "undefined" } size="small" id="copy_share" variant="contained" >🔗 Copy URL</Button>
            </CopyToClipboard>            
        </Grid>        
        <Grid xs={12}>
            <small><a href='https://pastebin.com/doc_api#1'>Get a Pastebin dev key here</a> Your parseq doc will be uploaded as a <strong>public</strong> paste.</small>
            {uploadStatus}
        </Grid>
        <Grid xs={12} paddingTop='20px'>
            <hr/>
            <DialogContentText paddingTop='20px' paddingBottom='5px'>
            <strong>Or</strong> copy your document metadata to share with others manually:
            </DialogContentText>
        </Grid>
        <Grid xs={10}>
            <TextField
                style={{ width: '100%' }}
                id="doc-export"
                label="Exportable output"
                multiline
                onFocus={event => event.target.select()}
                rows={10}
                InputProps={{ style: { fontFamily: 'Monospace', fontSize: '0.75em' } }}
                value={exportableDoc}
                variant="filled"
                />
                <Alert severity="info">This is for you to load your work in Parseq on another system. Don't use this directly in Deforum or Stable diffusion (use the rendered output from the main screen for that). This JSON object includes only keyframe data, not rendered data for each frame.</Alert>
        </Grid>
        <Grid xs={2} sx={{display: 'flex', justifyContent: 'right', alignItems: 'start'}}>
            <CopyToClipboard text={exportableDoc}>
                <Button size="small" id="copy_share" variant="contained"  >📋 Copy doc</Button>
            </CopyToClipboard>
        </Grid>
    </Grid>        
    </DialogContent>
    <DialogActions>
        <Button size="small" id="done_share" onClick={handleCloseShareDialog}>Done</Button>
    </DialogActions>
</Dialog>    

    return <div>
        {revertDialog}
        {loadDialog}
        {shareDialog}
        <Grid xs={12}>
            <Button size="small" variant="outlined" disabled={!docVersions || docVersions.length < 1} onClick={handleClickOpenRevertDialog}>↩️ Revert...</Button>
            <Button size="small" variant="outlined" onClick={handleClickOpenLoadDialog} style={{ marginLeft: 10 }}>⬇️ Load...</Button>
            <Button size="small" variant="outlined" onClick={handleClickOpenShareDialog} style={{ marginLeft: 10 }}>🔗 Share...</Button>
        </Grid>        
        <Grid xs={12}>
        <TextField
            id="doc-name"
            label="Doc name"
            fullWidth={true}
            value={activeDoc?.name}
            InputProps={{ style: { fontSize: '0.75em' } }}
            size="small"
            onChange={(e: any) => {
                debounce(db.parseqDocs.put({ name: e.target.value, docId: docId }, docId), 200)
                activeDoc.name = e.target.value;
            }}
        />
        <small><small>Last saved: {lastModified ? <ReactTimeAgo date={lastModified} locale="en-US" /> : "never"} </small></small>
        </Grid>
    </div>
}

function navigateToDocId(selectedDocIdForLoad: DocId) {
    const qps = new URLSearchParams(window.location.search);
    qps.delete("docId");
    qps.set("docId", selectedDocIdForLoad);
    const newUrl = window.location.href.split("?")[0] + "?" + qps.toString();
    window.location.assign(newUrl);
}
