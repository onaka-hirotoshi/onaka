(function () {
  "use strict";

  const cfg = window.APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    document.body.innerHTML =
      '<main style="padding:24px;font-family:sans-serif;color:#f4212e">' +
      '<h2>設定エラー</h2>' +
      '<p>Supabase の URL / anon key が設定されていません。' +
      '<code>twitter/config.js</code> を作成するか、GitHub Secrets を確認してください。</p>' +
      '</main>';
    return;
  }

  const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const $ = (id) => document.getElementById(id);
  const authView = $("authView");
  const feedView = $("feedView");
  const userArea = $("userArea");
  const userLabel = $("userLabel");
  const authForm = $("authForm");
  const authTitle = $("authTitle");
  const authSubmit = $("authSubmit");
  const authToggleLink = $("authToggleLink");
  const authToggleText = $("authToggleText");
  const authMessage = $("authMessage");
  const emailInput = $("email");
  const passwordInput = $("password");
  const signOutBtn = $("signOutBtn");
  const postForm = $("postForm");
  const postContent = $("postContent");
  const postSubmit = $("postSubmit");
  const postMessage = $("postMessage");
  const charCount = $("charCount");
  const feed = $("feed");
  const feedEmpty = $("feedEmpty");

  let mode = "signin";

  function setMessage(el, text, kind) {
    el.textContent = text || "";
    el.className = "msg" + (kind ? " " + kind : "");
  }

  function setMode(next) {
    mode = next;
    if (mode === "signin") {
      authTitle.textContent = "ログイン";
      authSubmit.textContent = "ログイン";
      authToggleText.textContent = "アカウントをお持ちでないですか？";
      authToggleLink.textContent = "新規登録";
      passwordInput.autocomplete = "current-password";
    } else {
      authTitle.textContent = "新規登録";
      authSubmit.textContent = "新規登録";
      authToggleText.textContent = "すでにアカウントをお持ちですか？";
      authToggleLink.textContent = "ログイン";
      passwordInput.autocomplete = "new-password";
    }
    setMessage(authMessage, "");
  }

  function showAuth() {
    authView.hidden = false;
    feedView.hidden = true;
    userArea.hidden = true;
  }

  function showFeed(user) {
    authView.hidden = true;
    feedView.hidden = false;
    userArea.hidden = false;
    userLabel.textContent = user?.email || "";
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return Math.floor(diff) + "秒前";
    if (diff < 3600) return Math.floor(diff / 60) + "分前";
    if (diff < 86400) return Math.floor(diff / 3600) + "時間前";
    return d.toLocaleString("ja-JP");
  }

  function authorLabel(t) {
    if (t.author_email) return t.author_email.split("@")[0];
    return "ユーザー";
  }

  function renderTweets(items) {
    feed.innerHTML = "";
    if (!items || items.length === 0) {
      feedEmpty.hidden = false;
      return;
    }
    feedEmpty.hidden = true;
    for (const t of items) {
      const li = document.createElement("li");
      li.className = "tweet";
      li.innerHTML =
        '<div class="tweet-meta">' +
        '<span class="tweet-author">@' + escapeHtml(authorLabel(t)) + "</span>" +
        '<span class="tweet-time">' + escapeHtml(formatTime(t.created_at)) + "</span>" +
        "</div>" +
        '<div class="tweet-content">' + escapeHtml(t.content) + "</div>";
      feed.appendChild(li);
    }
  }

  async function loadTweets() {
    const { data, error } = await supabase
      .from("tweets")
      .select("id, content, created_at, author_email")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      feed.innerHTML = "";
      feedEmpty.hidden = false;
      feedEmpty.textContent = "読み込みに失敗しました: " + error.message;
      return;
    }
    feedEmpty.textContent = "まだつぶやきがありません。";
    renderTweets(data);
  }

  authToggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    setMode(mode === "signin" ? "signup" : "signin");
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authSubmit.disabled = true;
    setMessage(authMessage, "処理中...");
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && !data.session) {
          setMessage(
            authMessage,
            "確認メールを送信しました。メール内のリンクをクリックしてからログインしてください。",
            "ok"
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage(authMessage, err.message || "エラーが発生しました", "error");
    } finally {
      authSubmit.disabled = false;
    }
  });

  signOutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  postContent.addEventListener("input", () => {
    charCount.textContent = postContent.value.length + " / 280";
  });

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = postContent.value.trim();
    if (!content) return;
    postSubmit.disabled = true;
    setMessage(postMessage, "投稿中...");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage(postMessage, "ログインが必要です", "error");
      postSubmit.disabled = false;
      return;
    }
    const { error } = await supabase.from("tweets").insert({
      content,
      user_id: user.id,
      author_email: user.email,
    });
    if (error) {
      setMessage(postMessage, error.message, "error");
    } else {
      postContent.value = "";
      charCount.textContent = "0 / 280";
      setMessage(postMessage, "");
      await loadTweets();
    }
    postSubmit.disabled = false;
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      showFeed(session.user);
      loadTweets();
    } else {
      showAuth();
    }
  });

  (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      showFeed(session.user);
      await loadTweets();
    } else {
      showAuth();
    }
  })();

  supabase
    .channel("tweets-feed")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tweets" },
      () => {
        if (!feedView.hidden) loadTweets();
      }
    )
    .subscribe();
})();
