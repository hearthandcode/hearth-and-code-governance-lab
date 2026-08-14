import type { CreateOnlyCandidatePlan, CreateOnlyReceipt } from "./types";

export class InMemoryCreateOnlyWriter {
  private readonly files = new Map<string, string>();
  create(plan: CreateOnlyCandidatePlan, confirmed: boolean): CreateOnlyReceipt {
    if (!confirmed) throw new Error("HCC-WRITER-CONFIRMATION: explicit per-write confirmation is required.");
    if (this.files.has(plan.targetPath)) throw new Error(`HCC-WRITER-COLLISION: ${plan.targetPath} already exists.`);
    this.files.set(plan.targetPath, plan.bytes);
    if (this.files.get(plan.targetPath) !== plan.bytes) throw new Error("HCC-WRITER-READBACK: in-memory read-back mismatch.");
    return { recordType: "hcc-create-only-memory-receipt", targetPath: plan.targetPath, digest: plan.digest, result: "created", effect: "in-memory-test-only" };
  }
  read(path: string): string | undefined { return this.files.get(path); }
}
