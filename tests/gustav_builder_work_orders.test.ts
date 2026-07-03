import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const WORK_ORDERS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'work_orders', 'fr_builder_work_orders.json');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');

describe('Gustav French builder work orders', () => {
  it('turns blocked feature-matrix rows into ordered French builder work orders', () => {
    const report = JSON.parse(fs.readFileSync(WORK_ORDERS_PATH, 'utf8'));
    const operator = fs.readFileSync(OPERATOR_PATH, 'utf8');

    expect(report.schemaVersion).toBe('gustav-fr-builder-work-orders-v1');
    expect(report.status).toBe('READY');
    expect(report.activationApproved).toBe(false);
    expect(report.summary.workOrderCount).toBeGreaterThanOrEqual(19);
    expect(report.summary.deepReasoningCount).toBeGreaterThan(report.summary.highReasoningCount);

    const first = report.workOrders[0];
    expect(first.featureId).toBe('research_best_practices');
    expect(first.builderId).toBe('french_research_packet_builder');
    expect(first.reasoningLevel).toBe('deep');
    expect(first.requiredSourceIds).toEqual(
      expect.arrayContaining([
        'coe_cefr_companion_2020',
        'tv5monde_apprendre',
        'tv5monde_grammar',
        'le_robert_dictionary',
        'le_robert_conjugation',
      ]),
    );

    for (const order of report.workOrders) {
      expect(order.status).toBe('READY_TO_BUILD');
      expect(order.activationApproved).toBe(false);
      expect(order.requiredSourceIds.length).toBeGreaterThan(0);
      expect(order.outputArtifacts.length).toBeGreaterThan(0);
      expect(order.gates.length).toBeGreaterThan(0);
      expect(order.acceptanceCriteria).toContain('research packet exists and cites requiredSourceIds');
    }

    expect(operator).toContain('scripts/gustav_builder_work_orders.mjs');
  });
});
