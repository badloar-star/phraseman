import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type Surface = {
  target: string;
  width: number;
  height: number;
  alpha: boolean;
};

type SurfaceMetadata = Surface & {
  bytes: number;
  alphaBounds?: { width: number; height: number } | null;
  error?: string;
};

const root = path.join(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

const SURFACES: Surface[] = [
  { target: 'assets/images/app_backdrops/wasabiInk/home.webp', width: 1080, height: 1920, alpha: false },
  { target: 'assets/images/app_backdrops/wasabiInk/settings.webp', width: 1080, height: 1920, alpha: false },
  { target: 'assets/images/app_backdrops/wasabiInk/referrals.webp', width: 1080, height: 1920, alpha: false },
  { target: 'assets/images/settings/referral_theme/invite-wasabiInk-v2.webp', width: 512, height: 171, alpha: false },
  { target: 'assets/theme-icons/wasabiInk.webp', width: 96, height: 96, alpha: true },
];

function surfaceMetadata(surfaces: Surface[]): SurfaceMetadata[] {
  const script = [
    "const fs=require('fs');const sharp=require('sharp');",
    `const surfaces=${JSON.stringify(surfaces)};`,
    "(async()=>{const rows=[];for(const surface of surfaces){const file=require('path').join(process.cwd(),surface.target);try{const image=sharp(file);const metadata=await image.metadata();let alphaBounds=null;if(metadata.hasAlpha){const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});let minX=info.width,minY=info.height,maxX=-1,maxY=-1;for(let y=0;y<info.height;y++){for(let x=0;x<info.width;x++){if(data[(y*info.width+x)*info.channels+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}}alphaBounds=maxX>=0?{width:maxX-minX+1,height:maxY-minY+1}:null;}rows.push({...surface,width:metadata.width,height:metadata.height,alpha:Boolean(metadata.hasAlpha),bytes:fs.statSync(file).size,alphaBounds});}catch(error){rows.push({...surface,bytes:0,error:String(error)});}}process.stdout.write(JSON.stringify(rows));})().catch(error=>{console.error(error);process.exit(1);});",
  ].join('');
  const result = spawnSync(process.execPath, ['--eval', script], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Sharp surface metadata check failed');
  return JSON.parse(result.stdout) as SurfaceMetadata[];
}

describe('Wasabi Ink premium surfaces', () => {
  test('wires only the approved runtime background slots', () => {
    const registry = read('components/appArtBackdropRegistry.ts');
    const backdrop = read('components/AppArtBackdrop.tsx');
    const referrals = read('app/referrals.tsx');

    expect(registry).toContain("'referrals'");
    expect(registry).toContain("referrals: 'referrals'");
    expect(registry).toContain("require('../assets/images/app_backdrops/wasabiInk/home.webp')");
    expect(registry).toContain("require('../assets/images/app_backdrops/wasabiInk/settings.webp')");
    expect(registry).toContain("require('../assets/images/app_backdrops/wasabiInk/referrals.webp')");
    expect(registry).toContain('getAppArtBackdropSource');
    expect(backdrop).toContain("from 'expo-image'");
    expect(backdrop).toContain('getAppArtBackdropSource(name, themeMode)');
    expect(referrals).toContain('artBackdrop="referrals"');
  });

  test('delivers the exact five approved production surfaces', () => {
    const metadata = surfaceMetadata(SURFACES);
    expect(metadata).toHaveLength(5);
    for (const surface of metadata) {
      expect(surface).toMatchObject({
        target: surface.target,
        width: SURFACES.find(item => item.target === surface.target)?.width,
        height: SURFACES.find(item => item.target === surface.target)?.height,
        alpha: SURFACES.find(item => item.target === surface.target)?.alpha,
      });
      expect(surface.error).toBeUndefined();
    }
  });

  test('keeps fullscreen art light and the theme icon visually full-size', () => {
    const metadata = surfaceMetadata(SURFACES);
    const backgrounds = metadata.slice(0, 3);
    for (const background of backgrounds) expect(background.bytes).toBeLessThanOrEqual(280 * 1024);
    expect(backgrounds.reduce((sum, background) => sum + background.bytes, 0)).toBeLessThanOrEqual(840 * 1024);

    const icon = metadata.find(surface => surface.target === 'assets/theme-icons/wasabiInk.webp');
    expect(icon?.alphaBounds?.width).toBeGreaterThanOrEqual(74);
    expect(icon?.alphaBounds?.height).toBeGreaterThanOrEqual(74);
  });
});
