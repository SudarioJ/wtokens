import { readFile } from "node:fs/promises";
import { z } from "zod";

async function audit() {
  const lock = z
    .object({
      packages: z.record(
        z.string(),
        z.object({ version: z.string().optional() }),
      ),
    })
    .parse(JSON.parse(await readFile("package-lock.json", "utf8")));
  const packages = new Map<
    string,
    { package: { name: string; ecosystem: "npm" }; version: string }
  >();
  for (const [path, data] of Object.entries(lock.packages)) {
    const name = path.split("node_modules/").at(-1);
    if (!path.startsWith("node_modules/") || !name || !data.version) continue;
    packages.set(`${name}@${data.version}`, {
      package: { name, ecosystem: "npm" },
      version: data.version,
    });
  }
  const queries = [...packages.values()];
  const response = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`OSV HTTP ${response.status}`);
  const result = z
    .object({
      results: z.array(
        z.object({ vulns: z.array(z.object({ id: z.string() })).optional() }),
      ),
    })
    .parse(await response.json());
  if (result.results.length !== queries.length)
    throw new Error("Incomplete audit response");
  let findings = 0;
  result.results.forEach((entry, index) => {
    if (!entry.vulns?.length) return;
    const item = queries[index]!;
    console.error(
      `${item.package.name}@${item.version}: ${entry.vulns.map((vuln) => vuln.id).join(", ")}`,
    );
    findings += entry.vulns.length;
  });
  console.log(
    `OSV: ${queries.length} locked package versions queried; ${findings} known vulnerability matches.`,
  );
  if (findings) process.exitCode = 1;
}
try {
  await audit();
} catch (error) {
  console.error(
    "Dependency audit inconclusive:",
    error instanceof Error ? error.message : "Invalid response",
  );
  process.exitCode = 2;
}
