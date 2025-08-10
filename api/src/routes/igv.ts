import { Router } from "express";
import fs from "fs";
import path from "path";

export const igvRouter = Router();

// Absolute path to phenopackets directory in this repo
const PHENOPACKET_DIR = "../diagnosis/phenopackets_uid_flat";

type PhenopacketVariant = {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  gene?: string | null;
  hgvs?: string | null;
  assembly?: string | null;
} | null;

function extractVariant(ppk: any): PhenopacketVariant {
  try {
    const v =
      ppk?.interpretations?.[0]?.diagnosis?.genomicInterpretations?.[0]
        ?.variantInterpretation?.variationDescriptor;
    const vcf = v?.vcfRecord;
    if (vcf?.chrom && vcf?.pos && vcf?.ref && vcf?.alt) {
      const hgvsC = Array.isArray(v?.expressions)
        ? v.expressions.find((e: any) => e?.syntax === "hgvs.c")?.value ?? null
        : null;
      return {
        chrom: String(vcf.chrom),
        pos: Number(vcf.pos),
        ref: String(vcf.ref),
        alt: String(vcf.alt),
        gene: v?.geneContext?.symbol ?? null,
        hgvs: hgvsC,
        assembly: vcf?.genomeAssembly ?? null,
      };
    }
  } catch {
    // fall through
  }
  return null;
}

igvRouter.get("/api/phenopackets", async (_req, res) => {
  try {
    const all = await fs.promises.readdir(PHENOPACKET_DIR);
    const jsonFiles = all
      .filter((f) => f.endsWith(".json"))
      .sort()
      .slice(0, 10); // CHANGE THIS NUMBER (3) TO GET MORE/LESS PHENOPACKETS
    const results: Array<{
      file: string;
      id: string | null;
      variant: PhenopacketVariant;
    }> = [];
    for (const file of jsonFiles) {
      const full = path.join(PHENOPACKET_DIR, file);
      const text = await fs.promises.readFile(full, "utf8");
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}
      results.push({
        file,
        id: data?.id ?? null,
        variant: data ? extractVariant(data) : null,
      });
    }
    res.json({ files: results });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: err?.message ?? "Failed to read phenopackets" });
  }
});
