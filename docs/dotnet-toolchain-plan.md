# P7 .NET toolchain plan

Planning record checked against the workspace and primary web sources on 2026-09-09. No SDK installation, package restore, project creation, build, or test was performed. V3 implementation remains gated on verified V2.

## Local inventory and published availability

The read-only commands `dotnet --list-sdks` and `dotnet --list-runtimes` returned SDK **10.0.302** under `C:\Program Files\dotnet\sdk`, with Microsoft.NETCore.App, Microsoft.AspNetCore.App, and Microsoft.WindowsDesktop.App **10.0.10**. Command exit was 0. This establishes installed versions, not project compatibility.

Microsoft's current [release metadata](https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json) and [.NET 10 download page](https://dotnet.microsoft.com/en-us/download/dotnet/10.0) publish SDK **10.0.401**, including .NET/ASP.NET Core **10.0.12**, released **2026-09-08**. The channel is active LTS with end of support **2028-11-14**. These values come from retrieved sources, not extrapolation from the environment clock.

The [support-policy page](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) still labels its patch table as updated 2026-08-11 and lists 10.0.11. Use current release metadata for the patch selection; the policy establishes LTS and the requirement to stay patched. The installed 10.0.10 runtime is behind that published patch. Recheck these sources when P7 actually begins.

## Proposed exact pins

These are published, metadata-compatible candidates, not a restored or tested combination. Use `net10.0`, nullable reference types, and normal C# 14 support; no preview language features.

| Component | Proposed pin | Evidence and scope |
| --- | --- | --- |
| .NET SDK | 10.0.401 | Microsoft release metadata above; pin in each standalone mission's global.json |
| ASP.NET Core shared runtime | 10.0.12 | Included by that SDK; use Microsoft.NET.Sdk.Web rather than an obsolete ASP.NET metapackage |
| Microsoft.EntityFrameworkCore | 10.0.12 | [Publisher package](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore) |
| Microsoft.EntityFrameworkCore.Design | 10.0.12 | [Versioned package](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.Design/10.0.12); development-only reference |
| dotnet-ef | 10.0.12 | [Publisher tool](https://www.nuget.org/packages/dotnet-ef); repository-local tool manifest |
| Microsoft.AspNetCore.Mvc.Testing | 10.0.12 | [Publisher package](https://www.nuget.org/packages/Microsoft.AspNetCore.Mvc.Testing); API test project only |
| Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.3 | [Publisher metadata](https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL) requires EF Core/Relational >=10.0.4 and <11.0.0, and Npgsql >=10.0.3 |
| Npgsql | 10.0.3 | [Versioned package](https://www.nuget.org/packages/Npgsql/10.0.3); explicit pin if directly used, otherwise record exact resolution in lockfile |
| xunit.v3.mtp-v2 | 4.0.0 | [Versioned package](https://www.nuget.org/packages/xunit.v3.mtp-v2/4.0.0), supporting .NET 8+ and MTP v2 |

EF Core 10.0.12 falls inside the provider's published dependency interval. Keep any directly referenced EF Core Relational package at the same 10.0.12 patch. Confirm the complete resolved graph during P7 and commit packages.lock.json; use locked restore for reproduced archives. This compatibility conclusion is an inference from target frameworks and dependency ranges, not a successful restore claim.

Choose native Microsoft Testing Platform mode for `dotnet test`. [Microsoft's runner documentation](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test) supports this in .NET 10. The [xUnit guide](https://xunit.net/docs/getting-started/v3/getting-started) documents the MTP v2 package and executable test projects. Its examples still show a prerelease; use the stable 4.0.0 package verified above.

Proposed global.json:

```json
{
  "sdk": { "version": "10.0.401", "rollForward": "disable", "allowPrerelease": false },
  "test": { "runner": "Microsoft.Testing.Platform" }
}
```

Exact selection intentionally fails when the SDK is absent; [global.json behavior](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json) explains the policy. Test projects use OutputType Exe. Document MTP commands consistently; do not mix VSTest filters/flags with MTP. If editor discovery specifically needs a VSTest adapter, separately evaluate published [xunit.runner.visualstudio 4.0.0](https://www.nuget.org/packages/xunit.runner.visualstudio) and [Microsoft.NET.Test.Sdk 18.10.0](https://www.nuget.org/packages/Microsoft.NET.Test.Sdk). They are not necessary for the selected native MTP CLI baseline.

## SDK download and checksum procedure for P7

The proposed SDK is absent locally. Do not replace the installed SDK during this planning phase. At P7, an isolated ZIP installation under a verified dedicated tools directory avoids changing machine-wide SDK selection. Microsoft publishes the [Windows x64 SDK ZIP](https://builds.dotnet.microsoft.com/dotnet/Sdk/10.0.401/dotnet-sdk-10.0.401-win-x64.zip) with this SHA-512 in the release metadata:

```text
24b670ad3d923bfcf47df6c3b034152398b42f6dbc388e10d783aee1cfb5e5817d399fc0ae2a12cfa822a55e61d34830ccb15c50ef6efee437ab874bb7c79430
```

Before downloading, retrieve the metadata over HTTPS and select release 10.0.12, SDK 10.0.401, RID win-x64, file name dotnet-sdk-win-x64.zip. Require exactly one match and use its published URL and hash. Download to a dedicated staging file, compare `(Get-FileHash -LiteralPath $sdkArchive -Algorithm SHA512).Hash` case-insensitively to that metadata hash, and stop on mismatch. Only then extract into a new dedicated directory and inspect its explicit dotnet.exe with --list-sdks and --list-runtimes. [Microsoft documents SHA-512 verification](https://learn.microsoft.com/en-us/dotnet/core/install/windows#verify-downloaded-binaries). No download or extraction was done here.

## P7 implementation acceptance

Keep standalone mission global.json, NuGet configuration, local dotnet-ef manifest, lockfiles, and PostgreSQL test configuration inside the .NET project boundary. Preserve the existing React API adapter and use real disposable PostgreSQL for EF/query/concurrency checks. First verify SDK selection, restore, build, and a discovered nonzero test count; then migrations on an empty database, repeatable seed, API contract parity, ownership, rollback, cancellation, and generated SQL behavior. Record exact commands and runtime evidence before describing this proposed toolchain as verified. No browser C# execution is required.

## Explicit SQL Server comparison coverage

Astra's scope review places the explicit SQL Server/T-SQL comparison in D10's third lesson, retaining its equivalent Node/.NET design-review subject. Use a substantive shared business scenario: compare the two API implementations, then PostgreSQL and SQL Server pagination/parameter syntax and EF provider/migration differences. Its activities cover a Node/.NET code review, SQL/T-SQL query reasoning, and a rubric-based design decision. PostgreSQL remains the runnable project default. Configuration/logging and background/deployment retain their own D10 lessons. This interprets "later" as the end of the .NET sequence and preserves all 30 defined V3 lesson subjects. Baseline inventories remain exact; explicitly registered future extensions may exceed published minimums but cannot substitute for missing baseline subjects. Next.js and Angular remain optional.