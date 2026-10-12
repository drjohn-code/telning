// Front-cover scenes come from the Story Wall kits (one hero scene per series world) with the series accent colour.
import { KITS } from './walls.mjs';
import site from '../../../src/data/site-data.json' with { type: 'json' };

export const COVERS = Object.fromEntries(site.series.map((s) => [s.key, { ...KITS[s.key], accent: s.colour }]));
