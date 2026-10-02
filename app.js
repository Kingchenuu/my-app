import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

const SUPABASE_URL = "https://ahhxrymujyqsrzqsyrqs.supabase.co";
const SUPABASE_KEY = "sb_publishable_lN4jSnIEm0Wz4Dd7_2WLYg_lhOTZNKe";
const FUNCTION_NAME = "pixverse-one-tap";
const MUSE_FUNCTION_NAME = "muse-one-tap";
const MUSE_CODE_FUNCTION_NAME = "muse-code-one-tap";
const DEFAULT_REFERENCE_URL = "https://raw.githubusercontent.com/Kingchenuu/my-app/main/reference_elevator_tiny.b64";

const MUSE_PRESETS = {
  daoxiang: `Photorealistic high-end interior architectural visualization of a Hualien rice-field-inspired kitchen in Taiwan. GOMENG design DNA: contemporary East Asian restrained style, natural walnut cabinetry, matte black accents, light warm-gray mineral plaster, tea-colored ribbed glass display cabinets, 2700-3000K indirect lighting, stone island, practical professional cabinet detailing, readable new-old junctions, maintainability-first details, calm atmosphere, golden rice fields and Hualien mountains outside, no cream style, no people, no text, no logos.`,
  song: `Photorealistic high-end interior architecture in Taiwan, GOMENG Song-inspired contemporary style. Restrained proportions, quiet horizontal lines, dark natural timber, warm gray mineral plaster, tea glass, matte black metal, 2700K concealed light, refined joinery, practical storage, understated stone, empty clean space, no cream style, no people, no text, no logos.`,
  warmblack: `Photorealistic GOMENG warm-black interior kitchen in Taiwan. Deep charcoal and matte black details balanced by natural walnut, warm gray mineral plaster, tea-colored glass, 2700-3000K indirect lighting, architectural shadow lines, practical buildable cabinetry, elegant stone island, restrained premium atmosphere, no cream style, no people, no text, no logos.`
};

const DEFAULT_PROMPT = `Photorealistic live-action cinematic suspense short in a modern Taiwan elevator at night. Preserve the timing and motion relationships of the reference video. One East Asian woman in her mid-20s stands alone holding a smartphone. Brushed-metal walls, cool fluorescent light, shallow depth of field, restrained natural acting. The floor indicator rises, then jumps to 13. Her mirror reflection begins to lag, then turns its head toward camera by itself while the real woman stays frozen. The reflection gives a subtle unnatural smile. Elevator doors open into a dark corridor. As the real woman moves to leave, the mirror reflection remains behind staring at camera. Strong first-second hook, realistic mirror materials, no gore, no monster deformation, no subtitles, no watermark, consistent face and wardrobe. Cut to black on a low-frequency sting.`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (id) => document.getElementById(id);
const els = {
  authView: $("authView"), mainView: $("mainView"), authForm: $("authForm"),
  email: $("emailInput"), password: $("passwordInput"), signUpBtn: $("signUpBtn"), authMsg: $("authMsg"),
  connectionBadge: $("connectionBadge"), generateBtn: $("generateBtn"), generateHint: $("generateHint"),
  progressCard: $("progressCard"), progressLabel: $("progressLabel"), progressPercent: $("progressPercent"),
  progressBar: $("progressBar"), progressDetail: $("progressDetail"), resultCard: $("resultCard"),
  resultVideo: $("resultVideo"), downloadBtn: $("downloadBtn"), shareBtn: $("shareBtn"),
  quality: $("qualitySelect"), prompt: $("promptInput"), audioSwitch: $("audioSwitch"), costWarning: $("costWarning"),
  jobsList: $("jobsList"), refreshJobsBtn: $("refreshJobsBtn"), keyForm: $("keyForm"), apiKey: $("apiKeyInput"),
  keyStatus: $("keyStatus"), deleteKeyBtn: $("deleteKeyBtn"), userEmail: $("userEmail"), logoutBtn: $("logoutBtn")
};

const museEls = {
  prompt: $("musePromptInput"),
  count: $("museCountSelect"),
  generateBtn: $("museGenerateBtn"),
  status: $("museStatus"),
  gallery: $("museGallery"),
  keyForm: $("museKeyForm"),
  apiKey: $("museApiKeyInput"),
  keyStatus: $("museKeyStatus"),
  deleteKeyBtn: $("museDeleteKeyBtn")
};

async function invokeMuse(action, body = {}) {
  const { data, error } = await supabase.functions.invoke(MUSE_FUNCTION_NAME, { body: { action, ...body } });
  if (error) throw new Error(error.message || "Muse 後端呼叫失敗");
  if (!data?.ok) throw new Error(data?.error || "Muse 操作失敗");
  return data;
}

function setMuseStatus(msg, isError = false) {
  if (!museEls.status) return;
  museEls.status.textContent = msg || "";
  museEls.status.style.color = isError ? "#ef9999" : "#d6c9b3";
}

function setMuseConnected(connected) {
  if (!museEls.keyStatus || !museEls.generateBtn) return;
  museEls.keyStatus.textContent = connected ? "已連線" : "未連線";
  museEls.keyStatus.className = "badge " + (connected ? "ok" : "bad");
  museEls.generateBtn.disabled = !connected;
}

async function refreshMuseConnection() {
  try {
    const data = await invokeMuse("connection_status");
    setMuseConnected(Boolean(data.connected));
    if (!data.connected) setMuseStatus("先到設定貼一次 Meta Model API Key。");
  } catch (err) {
    setMuseConnected(false);
    setMuseStatus("Muse 後端未就緒", true);
  }
}

if (museEls.prompt) museEls.prompt.value = MUSE_PRESETS.daoxiang;
document.querySelectorAll("[data-muse-preset]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("[data-muse-preset]").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  const key = b.dataset.musePreset;
  if (museEls.prompt && MUSE_PRESETS[key]) museEls.prompt.value = MUSE_PRESETS[key];
}));

if (museEls.keyForm) museEls.keyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const apiKey = museEls.apiKey.value.trim();
  if (!apiKey) return;
  const btn = museEls.keyForm.querySelector("button");
  btn.disabled = true; btn.textContent = "驗證 Muse 中…";
  try {
    await invokeMuse("save_key", { apiKey });
    museEls.apiKey.value = "";
    setMuseConnected(true);
    setMuseStatus("Muse Image 已連線，可以直接用手機出圖。");
  } catch (err) {
    setMuseStatus("連線失敗：" + err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = "安全連接 Muse";
  }
});

if (museEls.deleteKeyBtn) museEls.deleteKeyBtn.addEventListener("click", async () => {
  if (!confirm("確定移除 Muse 連線？")) return;
  try {
    await invokeMuse("delete_key");
    setMuseConnected(false);
    setMuseStatus("Muse 連線已移除。");
  } catch (err) {
    setMuseStatus(err.message, true);
  }
});

if (museEls.generateBtn) museEls.generateBtn.addEventListener("click", async () => {
  const prompt = museEls.prompt.value.trim();
  const count = Number(museEls.count.value || 1);
  if (!prompt) return setMuseStatus("請輸入生成指令。", true);
  museEls.generateBtn.disabled = true;
  museEls.gallery.innerHTML = "";
  setMuseStatus("Muse Image 生成中…");
  try {
    const data = await invokeMuse("generate", { prompt, count });
    for (const img of data.images || []) {
      const card = document.createElement("article");
      card.className = "muse-image-card";
      const image = document.createElement("img");
      image.src = img.url;
      image.alt = "Muse Image generated interior";
      image.loading = "lazy";
      const link = document.createElement("a");
      link.className = "btn ghost";
      link.href = img.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "開啟原圖";
      card.append(image, link);
      museEls.gallery.append(card);
    }
    setMuseStatus("完成 · " + (data.images?.length || 0) + " 張 · " + (data.model || "muse-image-1.0"));
  } catch (err) {
    setMuseStatus("生成失敗：" + err.message, true);
  } finally {
    museEls.generateBtn.disabled = false;
  }
});


const museCodeEls = {
  badge: $("museCodeBadge"),
  repo: $("museCodeRepo"),
  prompt: $("museCodePrompt"),
  runBtn: $("museCodeRunBtn"),
  status: $("museCodeStatus"),
  jobs: $("museCodeJobsList"),
  githubForm: $("githubKeyForm"),
  githubToken: $("githubTokenInput"),
  githubStatus: $("githubKeyStatus"),
  githubDeleteBtn: $("githubDeleteKeyBtn")
};

let museCodePollTimer = null;
const DEFAULT_CODE_TASK = "Inspect the selected repository for the current highest-impact incomplete engineering issue. Make the smallest safe code changes needed, preserve already verified modules, run relevant local tests when feasible, and leave all GitHub workflow files unchanged.";

async function invokeMuseCode(action, body = {}) {
  const { data, error } = await supabase.functions.invoke(MUSE_CODE_FUNCTION_NAME, { body: { action, ...body } });
  if (error) throw new Error(error.message || "Muse Code 後端呼叫失敗");
  if (!data?.ok) throw new Error(data?.error || "Muse Code 操作失敗");
  return data;
}

function setMuseCodeStatus(message, isError = false) {
  if (!museCodeEls.status) return;
  museCodeEls.status.textContent = message || "";
  museCodeEls.status.style.color = isError ? "#ef9999" : "#d6c9b3";
}

function setMuseCodeConnection(data) {
  if (!museCodeEls.badge || !museCodeEls.runBtn || !museCodeEls.githubStatus) return;
  const ready = Boolean(data?.museConnected && data?.githubConnected && data?.sparkAvailable);
  museCodeEls.runBtn.disabled = !ready;
  museCodeEls.githubStatus.textContent = data?.githubConnected ? "已連線" : "未連線";
  museCodeEls.githubStatus.className = "badge " + (data?.githubConnected ? "ok" : "bad");

  if (ready) {
    museCodeEls.badge.textContent = "雲端就緒";
    museCodeEls.badge.className = "badge ok";
    setMuseCodeStatus("Muse Code 可由手機直接派送，MSI 不必在線。");
  } else if (!data?.museConnected) {
    museCodeEls.badge.textContent = "缺 Muse Key";
    museCodeEls.badge.className = "badge bad";
    setMuseCodeStatus("先到設定連接 Meta Model API Key。");
  } else if (!data?.sparkAvailable) {
    museCodeEls.badge.textContent = "缺 Spark 權限";
    museCodeEls.badge.className = "badge bad";
    setMuseCodeStatus("目前 Meta Key 沒有 Muse Spark 權限；Muse Image 仍可使用。", true);
  } else if (!data?.githubConnected) {
    museCodeEls.badge.textContent = "缺 GitHub";
    museCodeEls.badge.className = "badge bad";
    setMuseCodeStatus("到設定連接 GitHub fine-grained token。");
  }
}

async function refreshMuseCodeConnection() {
  try {
    const data = await invokeMuseCode("connection_status");
    setMuseCodeConnection(data);
    return data;
  } catch (err) {
    if (museCodeEls.badge) {
      museCodeEls.badge.textContent = "後端未就緒";
      museCodeEls.badge.className = "badge bad";
    }
    if (museCodeEls.runBtn) museCodeEls.runBtn.disabled = true;
    setMuseCodeStatus(err.message, true);
    return null;
  }
}

function codeStatusLabel(status) {
  return ({
    queued: "排隊",
    dispatched: "已派送",
    claimed: "已領取",
    running: "執行中",
    completed: "完成",
    failed: "失敗"
  })[status] || status || "未知";
}

async function loadMuseCodeJobs() {
  if (!currentSession || !museCodeEls.jobs) return [];
  try {
    const data = await invokeMuseCode("recent");
    museCodeEls.jobs.replaceChildren();
    const jobs = data.jobs || [];
    if (!jobs.length) {
      const empty = document.createElement("div");
      empty.className = "code-job muted compact";
      empty.textContent = "還沒有 Muse Code 任務。";
      museCodeEls.jobs.append(empty);
      return jobs;
    }

    for (const job of jobs.slice(0, 8)) {
      const card = document.createElement("article");
      card.className = "code-job";

      const top = document.createElement("div");
      top.className = "job-top";
      const title = document.createElement("strong");
      title.textContent = job.repo?.split("/").pop() || "Muse Code";
      const state = document.createElement("span");
      state.className = "job-status";
      state.textContent = codeStatusLabel(job.status);
      top.append(title, state);

      const meta = document.createElement("p");
      meta.className = "muted compact";
      meta.textContent = new Date(job.created_at).toLocaleString("zh-TW");

      const task = document.createElement("p");
      task.className = "compact code-task";
      task.textContent = job.prompt || "";

      card.append(top, meta, task);

      if (job.pr_url) {
        const link = document.createElement("a");
        link.href = job.pr_url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "開啟 Pull Request →";
        card.append(link);
      }
      if (job.result_summary) {
        const summary = document.createElement("p");
        summary.className = "muted compact";
        summary.textContent = job.result_summary;
        card.append(summary);
      }
      if (job.error) {
        const error = document.createElement("p");
        error.className = "warning";
        error.textContent = job.error;
        card.append(error);
      }
      museCodeEls.jobs.append(card);
    }
    return jobs;
  } catch (err) {
    setMuseCodeStatus("讀取任務失敗：" + err.message, true);
    return [];
  }
}

async function pollMuseCodeJob(jobId, attempts = 0) {
  clearTimeout(museCodePollTimer);
  const jobs = await loadMuseCodeJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return;
  if (job.status === "completed") {
    setMuseCodeStatus(job.pr_url ? "完成，Pull Request 已建立。" : "完成，這次不需要修改檔案。");
    if (museCodeEls.runBtn) museCodeEls.runBtn.disabled = false;
    return;
  }
  if (job.status === "failed") {
    setMuseCodeStatus("Muse Code 失敗：" + (job.error || "請查看任務紀錄"), true);
    if (museCodeEls.runBtn) museCodeEls.runBtn.disabled = false;
    return;
  }
  if (attempts >= 180) {
    setMuseCodeStatus("任務仍在雲端執行，可稍後重新打開手機查看。");
    if (museCodeEls.runBtn) museCodeEls.runBtn.disabled = false;
    return;
  }
  museCodePollTimer = setTimeout(() => pollMuseCodeJob(jobId, attempts + 1), 5000);
}

if (museCodeEls.prompt) museCodeEls.prompt.value = DEFAULT_CODE_TASK;

if (museCodeEls.githubForm) museCodeEls.githubForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = museCodeEls.githubToken.value.trim();
  if (!token) return;
  const btn = museCodeEls.githubForm.querySelector("button");
  btn.disabled = true;
  btn.textContent = "驗證 GitHub 中…";
  try {
    const data = await invokeMuseCode("save_github_token", { token });
    museCodeEls.githubToken.value = "";
    setMuseCodeStatus("GitHub 已安全連接：" + (data.githubLogin || ""));
    await refreshMuseCodeConnection();
  } catch (err) {
    setMuseCodeStatus("GitHub 連線失敗：" + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "安全連接 GitHub";
  }
});

if (museCodeEls.githubDeleteBtn) museCodeEls.githubDeleteBtn.addEventListener("click", async () => {
  if (!confirm("確定移除 GitHub 執行權限？")) return;
  try {
    await invokeMuseCode("delete_github_token");
    await refreshMuseCodeConnection();
  } catch (err) {
    setMuseCodeStatus(err.message, true);
  }
});

if (museCodeEls.runBtn) museCodeEls.runBtn.addEventListener("click", async () => {
  const repo = museCodeEls.repo.value;
  const prompt = museCodeEls.prompt.value.trim();
  if (!prompt) return setMuseCodeStatus("請輸入工程任務。", true);

  museCodeEls.runBtn.disabled = true;
  setMuseCodeStatus("正在派送 Muse Code 雲端任務…");
  try {
    const data = await invokeMuseCode("run", { repo, prompt });
    setMuseCodeStatus("已派送 · " + data.model + " · GitHub Actions 啟動中");
    await loadMuseCodeJobs();
    await pollMuseCodeJob(data.jobId);
  } catch (err) {
    setMuseCodeStatus("無法啟動：" + err.message, true);
    museCodeEls.runBtn.disabled = false;
  }
});

let currentSession = null;
let pollTimer = null;
let currentResultUrl = "";

els.prompt.value = DEFAULT_PROMPT;

function setPanel(panelId) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === panelId));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.panel === panelId));
  if (panelId === "jobsPanel") loadJobs();
}
document.querySelectorAll(".nav-item").forEach((b) => b.addEventListener("click", () => setPanel(b.dataset.panel)));

function setAuthMessage(msg, isError = false) {
  els.authMsg.textContent = msg || "";
  els.authMsg.style.color = isError ? "#ef9999" : "#d6c9b3";
}
async function signIn() {
  const email = els.email.value.trim(), password = els.password.value;
  if (!email || password.length < 6) return setAuthMessage("請輸入 Email 與至少 6 碼密碼。", true);
  setAuthMessage("登入中…");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setAuthMessage(error.message, true);
  setAuthMessage("");
}
async function signUp() {
  const email = els.email.value.trim(), password = els.password.value;
  if (!email || password.length < 6) return setAuthMessage("請輸入 Email 與至少 6 碼密碼。", true);
  setAuthMessage("建立帳號中…");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return setAuthMessage(error.message, true);
  if (!data.session) setAuthMessage("帳號已建立。若系統要求驗證 Email，完成後再回來登入。");
  else setAuthMessage("");
}
els.authForm.addEventListener("submit", (e) => { e.preventDefault(); signIn(); });
els.signUpBtn.addEventListener("click", signUp);
els.logoutBtn.addEventListener("click", async () => { await supabase.auth.signOut(); });

async function invoke(action, body = {}) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: { action, ...body } });
  if (error) throw new Error(error.message || "後端呼叫失敗");
  if (!data?.ok) throw new Error(data?.error || "操作失敗");
  return data;
}

function setConnection(connected) {
  els.connectionBadge.textContent = connected ? "PixVerse 已連線" : "尚未連線";
  els.connectionBadge.className = "badge " + (connected ? "ok" : "bad");
  els.keyStatus.textContent = connected ? "已連線" : "未連線";
  els.keyStatus.className = "badge " + (connected ? "ok" : "bad");
  els.generateBtn.disabled = !connected;
  els.generateHint.textContent = connected ? "內建參考片 · 直接生成" : "先到設定連接 PixVerse";
}
async function refreshConnection() {
  try { const data = await invoke("connection_status"); setConnection(Boolean(data.connected)); }
  catch { setConnection(false); els.connectionBadge.textContent = "後端未就緒"; }
}

els.keyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const apiKey = els.apiKey.value.trim();
  if (!apiKey) return;
  const btn = els.keyForm.querySelector("button");
  btn.disabled = true; btn.textContent = "連接中…";
  try {
    await invoke("save_key", { apiKey });
    els.apiKey.value = "";
    setConnection(true);
  } catch (err) { alert("連線失敗：" + err.message); }
  finally { btn.disabled = false; btn.textContent = "安全連接 PixVerse"; }
});
els.deleteKeyBtn.addEventListener("click", async () => {
  if (!confirm("確定移除 PixVerse 連線？")) return;
  try { await invoke("delete_key"); setConnection(false); } catch (err) { alert(err.message); }
});
els.quality.addEventListener("change", () => {
  els.costWarning.classList.toggle("hidden", els.quality.value !== "1080p");
});

function setProgress(label, percent, detail = "") {
  els.progressCard.classList.remove("hidden");
  els.progressLabel.textContent = label;
  els.progressPercent.textContent = percent + "%";
  els.progressBar.style.width = percent + "%";
  els.progressDetail.textContent = detail;
}
function resetResult() {
  currentResultUrl = "";
  els.resultCard.classList.add("hidden");
  els.resultVideo.removeAttribute("src");
  els.downloadBtn.removeAttribute("href");
}
function showResult(url) {
  currentResultUrl = url;
  els.resultCard.classList.remove("hidden");
  els.resultVideo.src = url;
  els.downloadBtn.href = url;
  setProgress("完成", 100, "PixVerse 成片已完成");
}
async function pollJob(videoId) {
  clearTimeout(pollTimer);
  try {
    const data = await invoke("poll", { videoId });
    if (data.status === 1 && data.url) {
      showResult(data.url); els.generateBtn.disabled = false; loadJobs(); return;
    }
    if (data.status === 7) throw new Error("PixVerse 內容審核未通過");
    if (data.status === 8) throw new Error(data.error || "PixVerse 生成失敗");
    setProgress("PixVerse 生成中", 72, "已送出，正在渲染…");
    pollTimer = setTimeout(() => pollJob(videoId), 5000);
  } catch (err) {
    setProgress("失敗", 100, err.message); els.generateBtn.disabled = false;
  }
}

els.generateBtn.addEventListener("click", async () => {
  if (els.quality.value === "1080p" && !confirm("1080p + 影片參考會消耗較多 PixVerse API 點數。仍要生成？")) return;
  clearTimeout(pollTimer); resetResult(); els.generateBtn.disabled = true;
  try {
    setProgress("準備參考片", 12, "首次自動建立 PixVerse reference，之後直接沿用…");
    const data = await invoke("generate", {
      prompt: els.prompt.value.trim() || DEFAULT_PROMPT,
      quality: els.quality.value,
      generateAudio: els.audioSwitch.checked,
      referenceUrl: DEFAULT_REFERENCE_URL
    });
    setProgress("任務已送出", 45, "video_id: " + data.videoId);
    await pollJob(data.videoId);
  } catch (err) {
    setProgress("失敗", 100, err.message); els.generateBtn.disabled = false;
  }
});

els.shareBtn.addEventListener("click", async () => {
  if (!currentResultUrl) return;
  if (navigator.share) { try { await navigator.share({ title: "MY 一鍵生成", text: "PixVerse 成片", url: currentResultUrl }); } catch {} }
  else { await navigator.clipboard.writeText(currentResultUrl); alert("影片連結已複製"); }
});
function jobStatusText(status) { return ({1:"完成",5:"生成中",7:"審核未通過",8:"失敗"})[status] || "排隊中"; }
async function loadJobs() {
  if (!currentSession) return;
  els.jobsList.innerHTML = '<div class="job muted">載入中…</div>';
  const { data, error } = await supabase.from("my_pixverse_jobs")
    .select("id,video_id,status,result_url,quality,created_at,error")
    .order("created_at", { ascending: false }).limit(30);
  if (error || !data?.length) {
    els.jobsList.innerHTML = '<div class="job muted">還沒有生成紀錄。</div>'; return;
  }
  els.jobsList.innerHTML = data.map((j) => `
    <article class="job"><div class="job-top"><strong>PixVerse #${j.video_id || "—"}</strong>
    <span class="job-status">${jobStatusText(j.status)}</span></div>
    <p class="muted compact">${new Date(j.created_at).toLocaleString("zh-TW")} · ${j.quality || ""}</p>
    ${j.result_url ? `<a href="${j.result_url}" target="_blank" rel="noopener">開啟影片 →</a>` : ""}
    ${j.error ? `<p class="warning">${j.error}</p>` : ""}</article>
  `).join("");
}
els.refreshJobsBtn.addEventListener("click", loadJobs);

async function renderSession(session) {
  currentSession = session;
  const loggedIn = Boolean(session?.user);
  els.authView.classList.toggle("hidden", loggedIn);
  els.mainView.classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;
  els.userEmail.textContent = session.user.email || session.user.id;
  await refreshConnection();
  await refreshMuseConnection();
}
supabase.auth.onAuthStateChange((_event, session) => { renderSession(session); });
const { data: sessionData } = await supabase.auth.getSession();
await renderSession(sessionData.session);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
