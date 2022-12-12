import React from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import ParseqUI from './ParseqUI';
import packageJson from '../package.json';
import { Box, Chip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoffee, faBook, faBug } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import './robin.css';

// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
const firebaseConfig = {
  apiKey: "AIzaSyCGr7xczPkoHFQW-GanSAoAZZFGfLrYiTI",
  authDomain: "sd-parseq.firebaseapp.com",
  projectId: "sd-parseq",
  storageBucket: "sd-parseq.appspot.com",
  messagingSenderId: "830535540412",
  appId: "1:830535540412:web:858dde0a82381e6f32bab9",
  measurementId: "G-TPY8W4RQ83"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

//////////////////////////////////////////
// Config
const interpolatable_fields = [
  'seed',
  'scale',
  'noise',
  'strength',
  'contrast',
  'prompt_weight_1',
  'prompt_weight_2',
  'prompt_weight_3',
  'prompt_weight_4',
  'prompt_weight_5',
  'prompt_weight_6',
  'prompt_weight_7',
  'prompt_weight_8',
  'angle',
  'zoom',
  'perspective_flip_theta',
  'perspective_flip_phi',
  'perspective_flip_gamma',
  'perspective_flip_fv',
  'translation_x',
  'translation_y',
  'translation_z',
  'rotation_3d_x',
  'rotation_3d_y',
  'rotation_3d_z',
  'fov',
  'near',
  'far',
];

const settings_3d_only = [
  'translation_z',
  'rotation_3d_x',
  'rotation_3d_y',
  'rotation_3d_z',
  'fov',
  'near',
  'far',
]

const settings_2d_only = [
  'angle',
  'zoom',
  'perspective_flip_theta',
  'perspective_flip_phi',
  'perspective_flip_gamma',
  'perspective_flip_fv',
]

const default_keyframes = [
  {
    "frame": 0,
    "seed": 303,
    "seed_i": "L",
    "scale": 7,
    "noise": 0.12,
    "strength": 0.5,
    "strength_i": "L - pulse(pw=1,p=2b,a=0.3)",
    "prompt_weight_1": 1,
    "prompt_weight_1_i": "bez()",
    "prompt_weight_2": 0,
    "prompt_weight_2_i": "bez(0.5,0.9,0.5,0.1)",
    "prompt_weight_3": 1,
    "prompt_weight_3_i": "L",
    "prompt_weight_4": 0,
    "prompt_weight_4_i": "L",
    "prompt_weight_5": 0,
    "prompt_weight_6": 0,
    "prompt_weight_7": 0,
    "prompt_weight_8": 0,
    "angle": 0,
    "angle_i": "",
    "zoom": 1,
    "zoom_i": "C",
    "translation_x": 0,
    "translation_y": 0,
    "translation_z": 10,
    "rotation_3d_x": 0,
    "rotation_3d_y": 0,
    "rotation_3d_z": 0,
    "perspective_flip_theta": 0,
    "perspective_flip_phi": 0,
    "perspective_flip_gamma": 0,
    "perspective_flip_fv": 50,
    "contrast": 1,
    "fov": 40,
    "near": 200,
    "far": 10000,
  },
  {
    "frame": 40,
    "prompt_weight_1": 0,
    "prompt_weight_2": 1,
    "prompt_weight_3": 0,
    "angle": "",
    "zoom": 1.5
  },
  {
    "frame": 80,
    "prompt_weight_1": 0,
    "prompt_weight_2": 0,
    "prompt_weight_3": 1,
  },
  {
    "frame": 120,
    "seed": 606,
    "scale": 7,
    "noise": 0.12,
    "strength": 0.5,
    "prompt_weight_1": 0,
    "prompt_weight_2": 0,
    "prompt_weight_3": 0,
    "prompt_weight_4": 1,
    "prompt_weight_5": 0,
    "prompt_weight_6": 0,
    "prompt_weight_7": 0,
    "prompt_weight_8": 0,
    "angle": 0,
    "zoom": 0.5,
    "translation_x": 0,
    "translation_y": 0,
    "translation_z": 10,
    "rotation_3d_x": 0,
    "rotation_3d_y": 0,
    "rotation_3d_z": 0,
    "perspective_flip_theta": 0,
    "perspective_flip_phi": 0,
    "perspective_flip_gamma": 0,
    "perspective_flip_fv": 50,
    "contrast": 1,
    "fov": 40,
    "near": 200,
    "far": 10000
  }
];

const Deforum = () => {
  return (
    <div>
      <Grid container paddingLeft={5} paddingRight={5}>
        <Grid xs={9}>
          <h2>Parseq v{packageJson.version} for Deforum</h2>
        </Grid>
        <Grid xs={3} display='flex' justifyContent="space-around" alignItems='center' >
          <Chip variant="outlined" component="a" href="https://github.com/rewbs/sd-parseq#readme" clickable icon={<FontAwesomeIcon icon={faBook} />} label="Docs" />
          <Chip variant="outlined" component="a" href="https://github.com/rewbs/sd-parseq/issues" clickable icon={<FontAwesomeIcon icon={faBug} />} label="Bugs" />
          <Chip variant="outlined" component="a" href="https://github.com/rewbs/sd-parseq" clickable icon={<FontAwesomeIcon icon={faGithub} />} label="Code" />
          <Chip variant="outlined" component="a" href="https://www.buymeacoffee.com/rewbs" clickable icon={<FontAwesomeIcon icon={faCoffee} />} label="Coffee" />
        </Grid>
      </Grid>
      <ParseqUI
        interpolatable_fields={interpolatable_fields}
        default_keyframes={default_keyframes}
        default_displayFields={['noise', 'strength', 'prompt_weight_1', 'prompt_weight_2', 'prompt_weight_3', 'prompt_weight_4', 'zoom']}
        show_options={false}
        settings_3d_only={settings_3d_only}
        settings_2d_only={settings_2d_only}
      />
    </div>
  );
};

export default Deforum;