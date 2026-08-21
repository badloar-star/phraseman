import { Asset } from 'expo-asset';

// Static require keeps the canonical model in the offline application bundle.
// The generated file is deliberately one coherent character scene, never a collection of image layers.
export const HUMAN_V2_BASE_MODEL = require('../../assets/avatar-dna/human_v2/human_v2_base.glb');
export const HUMAN_V2_BASE_ASSET = Asset.fromModule(HUMAN_V2_BASE_MODEL);
