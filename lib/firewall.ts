export const INTRUSION_SIGNATURES: {
  category: string;
  pattern: RegExp;
  severity: "critical" | "warning";
}[] = [
  {
    category: "PowerShell RCE Injection",
    pattern: /\b(?:powershell(?:\.exe)?|pwsh(?:\.exe)?|invoke-expression|\biex\b|downloadstring|downloadfile|system\.management\.automation|invoke-webrequest|\biwr\b|start-process|set-executionpolicy|new-object\s+net\.webclient|invoke-command|get-process|get-service|get-wmiobject|get-ciminstance|get-content|powershell\s+-[a-zA-Z])\b/i,
    severity: "critical",
  },
  {
    category: "Windows Command Prompt Exploit",
    pattern: /\b(?:cmd(?:\.exe)?\s*\/(?:c|k)|certutil(?:\.exe)?\s*-(?:urlcache|decode|f)|bitsadmin(?:\.exe)?|rundll32(?:\.exe)?|cscript(?:\.exe)?|wscript(?:\.exe)?|regsvr32(?:\.exe)?|vssadmin|wmic(?:\.exe)?|whoami(?:\.exe)?|systeminfo(?:\.exe)?|tasklist(?:\.exe)?|ipconfig\s*\/all|net\s+(?:user|localgroup|share))\b/i,
    severity: "critical",
  },
  {
    category: "Unix Shell / Bash Command Injection",
    pattern: /(?:\/bin\/(?:bash|sh|zsh|dash)|(?:^|[;&|`\n])\s*(?:bash|sh|zsh)\s+-c|(?:^|[;&|`\n])\s*(?:curl|wget)\s+https?:\/\/|\|\s*(?:bash|sh|zsh)\b)/i,
    severity: "critical",
  },
  {
    category: "Destructive Command / Reverse Shell",
    pattern: /(?:;\s*(?:rm\s+-rf|cat\s+\/etc|whoami|uname\s+-a|killall|ncat|netcat|nc\s+-e|\/dev\/tcp\/))/i,
    severity: "critical",
  },
  {
    category: "Arbitrary Code Execution (eval/system)",
    pattern: /(?:\b(?:eval|passthru|shell_exec|proc_open|popen|system)\s*\(|child_process(?:\.exec|\.spawn))/i,
    severity: "critical",
  },
  {
    category: "System Probing & Secret Extraction",
    pattern: /(?:\b(?:ignore\s+(?:all\s+)?previous\s+instructions|system\s+prompt|reveal\s+(?:your\s+)?secret|dump\s+database|show\s+(?:all\s+)?passwords|database\s+password|supabase_service_role|paystack_secret|datamart_key|datamart_api_key|arkesel_api_key|admin_secret_key|access_token|process\.env|show\s+me\s+the\s+keys)\b)/i,
    severity: "critical",
  },
  {
    category: "SQL Injection Probe",
    pattern: /(?:\bunion\s+(?:all\s+)?select\b|\b(?:and|or)\s+['"]?1['"]?\s*=\s*['"]?1\b|\bwaitfor\s+delay\b|\bpg_sleep\s*\(|\bbenchmark\s*\(|;\s*drop\s+(?:table|database|schema)\b|information_schema\.(?:tables|columns)|xp_cmdshell)/i,
    severity: "critical",
  },
  {
    category: "Path Traversal Probe",
    pattern: /(?:\.\.[\/\\]\.\.[\/\\]|\/etc\/(?:passwd|shadow|hosts)|[a-zA-Z]:\\windows\\system32|win\.ini)/i,
    severity: "critical",
  },
  {
    category: "Environment / Secret File Probe",
    pattern: /(?:(?:\/|\b)\.env(?:\.local|\.production|\.backup)?\b|(?:\/|\b)\.git(?:\/|\\|\b)|wp-config\.php|phpmyadmin|actuator\/env|swagger-ui|\/shell\b)/i,
    severity: "critical",
  },
];

export function inspectPayloadForThreats(targetString: string): { matched: boolean; category?: string; snippet?: string; severity?: "critical" | "warning" } {
  for (const sig of INTRUSION_SIGNATURES) {
    if (sig.pattern.test(targetString)) {
      const match = targetString.match(sig.pattern);
      return {
        matched: true,
        category: sig.category,
        snippet: match ? match[0].slice(0, 100) : "Threat pattern matched",
        severity: sig.severity,
      };
    }
  }
  return { matched: false };
}
