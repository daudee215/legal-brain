# Fetching Lahore High Court and Punjab cause lists from Pakistan

The Lahore High Court (lhc.gov.pk, data.lhc.gov.pk) and the Punjab district courts (dsj.punjab.gov.pk) only
accept connections from inside Pakistan. GitHub's own servers are in the US, so they cannot reach these sites.

The fix is a **self-hosted runner**: a computer in Pakistan that GitHub asks to run one small job a few times a
day. It downloads the lists and hands them to the normal deploy, which publishes them on wakeelpropk.com.

You need one of these:

- **A Windows PC in Pakistan** that is switched on and online in the evening (around 6–9:30 pm) and early morning
  (around 6:30 am). An office desktop is ideal.
- **Or a cheap Pakistani VPS** (any Pakistani hosting company's smallest Linux or Windows server, 1 GB RAM is enough).

> Status: the Lahore / Punjab adapters are still a scaffold (see the TODO in
> `scripts/causelists/adapters/pakistan-only.mjs`). Someone must finish them from a Pakistani connection first.
> Setting up the runner now is still useful: the job will run and simply report "adapter not finished yet".

---

## Part 1 — Register the runner (Windows PC)

1. Install **Node.js 22 LTS** from <https://nodejs.org> (accept the defaults) and **Git for Windows** from
   <https://git-scm.com>.
2. On GitHub, open the repository **daudee215/legal-brain** → **Settings** → **Actions** → **Runners** →
   **New self-hosted runner** → choose **Windows** and **x64**.
3. GitHub shows a list of PowerShell commands. Open **PowerShell** (Start menu → type "PowerShell"), then copy and
   run them one by one. They:
   - create a folder `C:\actions-runner` and download the runner into it;
   - run `.\config.cmd --url https://github.com/daudee215/legal-brain --token <a one-time token>`.
4. When `config.cmd` asks questions:
   - **Runner group**: press Enter (Default).
   - **Name of runner**: e.g. `pakistan-office-pc`.
   - **Additional labels**: type **`pakistan`** and press Enter. *(This label is what the workflow looks for.)*
   - **Work folder**: press Enter (`_work`).
   - **Run as service?** Answer **Y** so it starts by itself when the PC turns on. Accept the default account.
5. Back on GitHub → Settings → Actions → Runners, the runner should show as **Idle** (green dot) with the labels
   `self-hosted`, `Windows`, `X64`, `pakistan`.

The token in step 3 is single-use and expires after an hour; it is not a password you need to keep.

## Part 1 (alternative) — Register the runner on a Linux VPS

1. Log in to the VPS (SSH) and install Node.js 22 (e.g. `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs git`).
2. GitHub → Settings → Actions → Runners → **New self-hosted runner** → **Linux** / **x64**, and run the commands
   it shows (as a normal user, not root).
3. At the **Additional labels** question type **`pakistan`**.
4. Install it as a service so it survives reboots: `sudo ./svc.sh install && sudo ./svc.sh start`.

## Part 2 — Switch the schedule on

1. GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**.
2. Name **`PK_RUNNER`**, value **`on`**. Save.

Until this variable exists the Pakistan job only runs when started by hand, so nothing piles up waiting for a
runner that is not there.

## Part 3 — Test it

1. GitHub → **Actions** → **Cause lists (Pakistan runner)** → **Run workflow**.
2. Open the run: the "Fetch Pakistan-only cause lists" step prints one line per court and day.
3. When it finishes, the **Deploy to GitHub Pages** workflow starts on its own and publishes the lists.

## Good to know

- The job only *reads* public cause lists. It sends no client or case information anywhere.
- If the PC is off, that run is simply skipped (it waits up to a day in the queue, then gives up). The Islamabad
  and Peshawar lists are not affected — they are fetched by GitHub's own servers.
- **This repository is public, which matters for self-hosted runners.** A pull request from a stranger could
  contain a workflow that tries to run on your PC. This repository's own workflows never use the runner for pull
  requests, but also set GitHub → Settings → Actions → General → "Fork pull request workflows from outside
  collaborators" to **Require approval for all outside collaborators**, and never approve a run you don't
  recognise. A small dedicated VPS is the safer choice than a PC that holds the chamber's files.
- Keep the machine's updates on, and register the runner for this repository only.
- To remove it later: Settings → Actions → Runners → the runner → **Remove**, then on the PC run
  `.\config.cmd remove` in `C:\actions-runner`.
