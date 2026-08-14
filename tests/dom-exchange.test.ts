// @vitest-environment happy-dom

import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseExchangeContract, renderExchange } from "../src/exchange";
import { VALID_EXCHANGE_SOURCE } from "./fixtures/exchange";
import { VALID_STUDIO_SOURCE } from "./fixtures/studio";

const digestText = async (value: string): Promise<string> => `sha256:${createHash("sha256").update(value).digest("hex")}`;
beforeEach(() => document.body.replaceChildren());

describe("C6 provider-neutral exchange renderer", () => {
  it("copies one fixed prompt without a provider call and validates a pasted proposal in memory", async () => {
    const parsed = parseExchangeContract(VALID_EXCHANGE_SOURCE); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("div"); renderExchange(container, parsed.exchange, { copyText, digestText });
    expect(container.textContent).toContain("You choose the destination; its retention remains unknown");
    expect(container.querySelectorAll("thead th[scope=col]")).toHaveLength(6);
    const exportButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Build and copy prompt packet")!; exportButton.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledTimes(1));
    const packet = JSON.parse(copyText.mock.calls[0]![0]);
    expect(packet.effects).toMatchObject({ provider_call: "not-performed", network: "prohibited", persistence: "prohibited" });

    const textarea = container.querySelector<HTMLTextAreaElement>("textarea")!; textarea.value = VALID_STUDIO_SOURCE;
    const validate = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Validate imported candidate")!; validate.click();
    expect(container.querySelector(".hcc-exchange__import-output [data-studio-id]")).not.toBeNull();
    expect(container.textContent).toContain("It remains unadmitted and was not persisted");
  });

  it("shows stale-digest and malicious-import diagnostics without copying or interpreting HTML", async () => {
    const parsed = parseExchangeContract(VALID_EXCHANGE_SOURCE); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    parsed.exchange.context.sources[0]!.content += " stale";
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("div"); renderExchange(container, parsed.exchange, { copyText, digestText });
    Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Build and copy prompt packet")!.click();
    await vi.waitFor(() => expect(container.textContent).toContain("Prompt held")); expect(copyText).not.toHaveBeenCalled();

    const textarea = container.querySelector<HTMLTextAreaElement>("textarea")!; textarea.value = "<img src=x onerror=alert(1)>";
    Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Validate imported candidate")!.click();
    expect(container.querySelector("img")).toBeNull(); expect(container.textContent).toContain("Nothing was persisted");
  });
});
