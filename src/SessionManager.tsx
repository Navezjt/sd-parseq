import React, { useState, useEffect } from 'react';
import { gapi, loadAuth2 } from 'gapi-script'

import { Alert, Button, Checkbox, FormControlLabel, FormGroup, FormLabel, TextField, InputLabel} from '@mui/material';
import { FormControl, Select, MenuItem} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';


export const SessionManager = (props: any) => {


    return <Grid xs={12}>
      <FormControl fullWidth>
        <FormLabel component="legend">Title: </FormLabel>
        <TextField>Hideous Despair</TextField>
        <small>Source: (local / gdrive)</small>

        <InputLabel id="select-history-label">History</InputLabel>
        <Select
          labelId="select-history-label"
          id="select-history"
          value="current"
          label="History"
        >
          <MenuItem value={10}>2022-02-01 @ 22:10.54</MenuItem>
          <MenuItem value={20}>2022-02-01 @ 22:09.21</MenuItem>
        </Select>

        
        <Button id="select-load-label">Load from local storage</Button>
        <Button id="select-load-label">Load from Google Drive</Button>
        
        // Import from text
        <Button id="select-load-label">Import session</InputLabel>



      </FormControl>


        
        <FormLabel component="legend">History: </FormLabel>
        

        </Grid>;
}
