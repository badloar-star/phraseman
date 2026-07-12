export class ReadBudget {
  private reserved = 0;
  private consumed = 0;

  constructor(readonly maximum: number) {
    if (!Number.isInteger(maximum) || maximum < 1) {
      throw new Error("xp_audit_read_budget_exceeded");
    }
  }

  reserve(count: number): (actual?: number) => void {
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      this.consumed + this.reserved + count > this.maximum
    ) {
      throw new Error("xp_audit_read_budget_exceeded");
    }

    this.reserved += count;
    let settled = false;
    return (actual = count): void => {
      if (settled) throw new Error("xp_audit_budget_reservation_reused");
      if (!Number.isInteger(actual) || actual < 0 || actual > count) {
        throw new Error("xp_audit_invalid_billed_read_settlement");
      }
      settled = true;
      this.reserved -= count;
      this.consumed += actual;
    };
  }

  get count(): number {
    return this.consumed;
  }
}
