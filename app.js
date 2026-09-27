import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

const SUPABASE_URL = "https://ahhxrymujyqsrzqsyrqs.supabase.co";
const SUPABASE_KEY = "sb_publishable_lN4jSnIEm0Wz4Dd7_2WLYg_lhOTZNKe";
const FUNCTION_NAME = "pixverse-one-tap";
const DEFAULT_REFERENCE_URL = "https://raw.githubusercontent.com/Kingchenuu/my-app/main/reference_elevator_tiny.b64";

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
}
supabase.auth.onAuthStateChange((_event, session) => { renderSession(session); });
const { data: sessionData } = await supabase.auth.getSession();
await renderSession(sessionData.session);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
