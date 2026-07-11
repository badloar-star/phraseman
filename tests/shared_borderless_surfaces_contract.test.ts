import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LEDGER = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs', 'reports', 'borderless_surface_inventory.json'), 'utf8'),
) as {
  entries: Array<{
    id: string;
    category: string;
    status: string;
    scanState: string;
    reason: string;
  }>;
};

const TARGET_IDS = [
  'surface:components-activityheatmap365:card:1',
  'surface:components-activityheatmap365:detailtile:1',
  'surface:components-activityheatmap365:goalbtn:1',
  'surface:components-activityheatmap365:goalcard:1',
  'surface:components-activityheatmap365:headerstatuspill:1',
  'surface:components-activityheatmap365:insightcard:1',
  'surface:components-activityheatmap365:mapshell:1',
  'surface:components-activityheatmap365:modalcard:1',
  'surface:components-activityheatmap365:montharrow:1',
  'surface:components-activityheatmap365:nextstepbar:1',
  'surface:components-activityheatmap365:periodcard:1',
  'surface:components-activityheatmap365:reportbtn:1',
  'surface:components-activityheatmap365:reportsummary:1',
  'surface:components-activityheatmap365:statpill:1',
  'surface:components-aimistakecard:simplebutton:1',
  'surface:components-appmessagesinbox:badge:1',
  'surface:components-appmessagesinbox:panel:1',
  'surface:components-appmessagesinbox:pollbadge:1',
  'surface:components-appmessagesinbox:pollcard:1',
  'surface:components-appmessagesinbox:roundicon:1',
  'surface:components-certificatenamemodal:card:1',
  'surface:components-certificatenamemodal:primarybtn:1',
  'surface:components-certificatenamemodal:ribbon:1',
  'surface:components-helpboardpanel:helpboardpanel:2',
  'surface:components-playerprofilemodal:player-profile-add-friend:1',
  'surface:components-playerprofilemodal:playerprofilemodalbody:1',
  'surface:components-playerprofilemodal:playerprofilemodalbody:2',
  'surface:components-registrationpromptmodal:busypanel:1',
  'surface:components-registrationpromptmodal:card:1',
  'surface:components-registrationpromptmodal:registrationpromptmodal:1',
  'surface:components-registrationpromptmodal:registrationpromptmodal:2',
  'surface:components-worddrillcard:card:1',
  'surface:components-worddrillcard:pill:1',
] as const;

describe('shared borderless production surfaces', () => {
  it('migrates the frozen ordinary-container ledger rows without reclassification', () => {
    expect(TARGET_IDS.length).toBeGreaterThan(0);
    for (const id of TARGET_IDS) {
      const row = LEDGER.entries.find((entry) => entry.id === id);
      expect(row).toBeDefined();
      expect(row?.category).toBe('MIGRATE');
      expect(row?.status).toBe('migrated');
      expect(row?.scanState).toBe('missing');
      expect(row?.reason).toBeTruthy();
    }
  });
});
