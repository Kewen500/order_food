const STORAGE_KEY = "couple-food-realtime-v1";
const DEVICE_KEY = "couple-food-device-id";
const ROOM_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

const categories = ["全部", "中餐", "日料", "韩餐", "西餐", "火锅", "小吃", "甜品", "饮品"];
const moods = ["都可以", "清淡", "重口", "省心", "约会感", "热乎", "甜一点"];

const starterDishes = [
  { id: "beef-noodle", name: "牛肉面", category: "中餐", price: 32, status: "热乎", spice: "微辣", emoji: "🍜" },
  { id: "claypot-rice", name: "煲仔饭", category: "中餐", price: 38, status: "省心", spice: "不辣", emoji: "🍚" },
  { id: "hotpot", name: "鸳鸯火锅", category: "火锅", price: 128, status: "重口", spice: "可选", emoji: "🥘" },
  { id: "sushi", name: "寿司拼盘", category: "日料", price: 68, status: "约会感", spice: "不辣", emoji: "🍣" },
  { id: "ramen", name: "豚骨拉面", category: "日料", price: 45, status: "热乎", spice: "不辣", emoji: "🍜" },
  { id: "bibimbap", name: "石锅拌饭", category: "韩餐", price: 42, status: "重口", spice: "中辣", emoji: "🍲" },
  { id: "fried-chicken", name: "韩式炸鸡", category: "韩餐", price: 58, status: "省心", spice: "甜辣", emoji: "🍗" },
  { id: "steak", name: "小牛排", category: "西餐", price: 98, status: "约会感", spice: "不辣", emoji: "🥩" },
  { id: "pizza", name: "薄底披萨", category: "西餐", price: 72, status: "省心", spice: "不辣", emoji: "🍕" },
  { id: "dumpling", name: "鲜肉锅贴", category: "小吃", price: 26, status: "省心", spice: "不辣", emoji: "🥟" },
  { id: "mala-tang", name: "麻辣烫", category: "小吃", price: 36, status: "重口", spice: "自选", emoji: "🍢" },
  { id: "salad", name: "鸡胸沙拉", category: "西餐", price: 39, status: "清淡", spice: "不辣", emoji: "🥗" },
  { id: "congee", name: "皮蛋瘦肉粥", category: "中餐", price: 24, status: "清淡", spice: "不辣", emoji: "🥣" },
  { id: "cake", name: "草莓蛋糕", category: "甜品", price: 36, status: "甜一点", spice: "不辣", emoji: "🍰" },
  { id: "milk-tea", name: "珍珠奶茶", category: "饮品", price: 18, status: "甜一点", spice: "不辣", emoji: "🧋" },
  { id: "lemon-tea", name: "柠檬茶", category: "饮品", price: 16, status: "清淡", spice: "不辣", emoji: "🍋" },
];

const emptyState = {
  activeTab: "pick",
  activeCategory: "全部",
  activeMood: "都可以",
  room: null,
  me: null,
  members: [],
  dishes: [],
  votes: [],
  menuItems: [],
  events: [],
  loading: false,
};

const state = { ...emptyState };
const deviceId = getOrCreateDeviceId();
let supabaseClient = null;
let realtimeChannel = null;
let selectedDecisionId = null;
let toastTimer = null;
let noteTimer = null;
let budgetTimer = null;
let nicknameTimer = null;
let roomSettingsTimer = null;
let isRenderingInputs = false;

const els = {
  lobbyView: document.querySelector("#lobbyView"),
  roomView: document.querySelector("#roomView"),
  configWarning: document.querySelector("#configWarning"),
  createRoomForm: document.querySelector("#createRoomForm"),
  joinRoomForm: document.querySelector("#joinRoomForm"),
  createRoomCode: document.querySelector("#createRoomCode"),
  createNickname: document.querySelector("#createNickname"),
  createMaxMembers: document.querySelector("#createMaxMembers"),
  joinRoomCode: document.querySelector("#joinRoomCode"),
  joinNickname: document.querySelector("#joinNickname"),
  roomCodeLabel: document.querySelector("#roomCodeLabel"),
  roomTitle: document.querySelector("#roomTitle"),
  leaveRoomBtn: document.querySelector("#leaveRoomBtn"),
  statMatch: document.querySelector("#statMatch"),
  statBudget: document.querySelector("#statBudget"),
  statCount: document.querySelector("#statCount"),
  memberCount: document.querySelector("#memberCount"),
  memberLimit: document.querySelector("#memberLimit"),
  meLabel: document.querySelector("#meLabel"),
  syncStatus: document.querySelector("#syncStatus"),
  ownerTools: document.querySelector("#ownerTools"),
  clearRoomMenu: document.querySelector("#clearRoomMenu"),
  roomNameInput: document.querySelector("#roomNameInput"),
  maxMembersInput: document.querySelector("#maxMembersInput"),
  memberList: document.querySelector("#memberList"),
  moodChips: document.querySelector("#moodChips"),
  shuffleMood: document.querySelector("#shuffleMood"),
  meName: document.querySelector("#meName"),
  budgetInput: document.querySelector("#budgetInput"),
  categoryTabs: document.querySelector("#categoryTabs"),
  randomResultBar: document.querySelector("#randomResultBar"),
  dishGrid: document.querySelector("#dishGrid"),
  decideBtn: document.querySelector("#decideBtn"),
  voteBoard: document.querySelector("#voteBoard"),
  addDishForm: document.querySelector("#addDishForm"),
  newDishName: document.querySelector("#newDishName"),
  newDishCategory: document.querySelector("#newDishCategory"),
  newDishPrice: document.querySelector("#newDishPrice"),
  orderTotal: document.querySelector("#orderTotal"),
  budgetDiff: document.querySelector("#budgetDiff"),
  matchScore: document.querySelector("#matchScore"),
  orderList: document.querySelector("#orderList"),
  orderNote: document.querySelector("#orderNote"),
  historyList: document.querySelector("#historyList"),
  toast: document.querySelector("#toast"),
  decisionModal: document.querySelector("#decisionModal"),
  closeDecision: document.querySelector("#closeDecision"),
  decisionDish: document.querySelector("#decisionDish"),
  addDecision: document.querySelector("#addDecision"),
  againDecision: document.querySelector("#againDecision"),
};

function getConfig() {
  return window.APP_CONFIG || {};
}

function isSupabaseReady() {
  const config = getConfig();
  return Boolean(
    window.supabase &&
      config.supabaseUrl &&
      config.supabaseAnonKey &&
      !config.supabaseUrl.includes("YOUR_") &&
      !config.supabaseAnonKey.includes("YOUR_"),
  );
}

function getClient() {
  if (!supabaseClient && isSupabaseReady()) {
    const config = getConfig();
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return supabaseClient;
}

function getOrCreateDeviceId() {
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved) return saved;
  const id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function loadLocalSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLocalSession(extra = {}) {
  const payload = {
    device_id: deviceId,
    room_code: state.room?.room_code || extra.room_code || "",
    nickname: state.me?.nickname || extra.nickname || "",
    cached_room: state.room,
    cached_members: state.members,
    cached_dishes: state.dishes,
    cached_votes: state.votes,
    cached_menu_items: state.menuItems,
    cached_events: state.events.slice(0, 30),
    ...extra,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function restoreCachedRoom() {
  const saved = loadLocalSession();
  if (!saved.cached_room) return;
  state.room = saved.cached_room;
  state.members = saved.cached_members || [];
  state.dishes = saved.cached_dishes || [];
  state.votes = saved.cached_votes || [];
  state.menuItems = saved.cached_menu_items || [];
  state.events = saved.cached_events || [];
  state.me = state.members.find((member) => member.device_id === deviceId) || null;
  showRoom();
  setSyncStatus("当前可能不是最新数据", true);
  render();
}

function normalizeRoomCode(value) {
  return value.trim();
}

function validateRoomCode(code) {
  if (!code) return "房间码不能为空";
  if (!ROOM_CODE_PATTERN.test(code)) return "房间码只能使用字母、数字、短横线和下划线";
  return "";
}

function normalizeNickname(value) {
  return value.trim() || "我";
}

function clampMaxMembers(value) {
  return Math.min(6, Math.max(2, Number(value) || 2));
}

function showLobby() {
  els.lobbyView.hidden = false;
  els.roomView.hidden = true;
}

function showRoom() {
  els.lobbyView.hidden = true;
  els.roomView.hidden = false;
}

function setLoading(loading) {
  state.loading = loading;
  document.querySelectorAll("button, input, select, textarea").forEach((node) => {
    node.disabled = loading;
  });
}

function setSyncStatus(text, offline = false) {
  els.syncStatus.textContent = text;
  els.syncStatus.classList.toggle("offline", offline);
}

async function createRoom(event) {
  event.preventDefault();
  const client = getClient();
  if (!client) {
    toast("请先填写 Supabase 配置");
    return;
  }

  const roomCode = normalizeRoomCode(els.createRoomCode.value);
  const codeError = validateRoomCode(roomCode);
  if (codeError) {
    toast(codeError);
    return;
  }

  const nickname = normalizeNickname(els.createNickname.value);
  const maxMembers = clampMaxMembers(els.createMaxMembers.value);
  setLoading(true);

  try {
    const existing = await client.from("rooms").select("id").eq("room_code", roomCode).maybeSingle();
    if (existing.data) {
      toast("房间码已存在，请换一个");
      return;
    }
    if (existing.error) throw existing.error;

    const roomInsert = await client
      .from("rooms")
      .insert({
        room_code: roomCode,
        display_name: "今晚吃什么",
        owner_id: deviceId,
        max_members: maxMembers,
        budget: 120,
        selected_category: "全部",
        selected_status: "都可以",
        note: "",
      })
      .select()
      .single();
    if (roomInsert.error) {
      if (roomInsert.error.code === "23505") toast("房间码已存在，请换一个");
      else throw roomInsert.error;
      return;
    }

    const room = roomInsert.data;
    const memberInsert = await client.from("room_members").insert({
      room_id: room.id,
      device_id: deviceId,
      nickname,
      role: "owner",
    });
    if (memberInsert.error) throw memberInsert.error;

    const starterRows = starterDishes.map((dish) => ({
      id: dish.id,
      room_id: room.id,
      name: dish.name,
      category: dish.category,
      price: dish.price,
      status: dish.status,
      spice: dish.spice,
      emoji: dish.emoji,
      is_custom: false,
      created_by: deviceId,
    }));
    const dishesInsert = await client.from("dishes").insert(starterRows);
    if (dishesInsert.error) throw dishesInsert.error;

    await enterRoom(roomCode, nickname, { skipCapacityCheck: true, announceJoin: false });
  } catch (error) {
    console.error(error);
    toast("创建房间失败，请检查网络和 Supabase 表结构");
  } finally {
    setLoading(false);
  }
}

async function joinRoom(event) {
  event.preventDefault();
  const roomCode = normalizeRoomCode(els.joinRoomCode.value);
  const codeError = validateRoomCode(roomCode);
  if (codeError) {
    toast(codeError);
    return;
  }
  await enterRoom(roomCode, normalizeNickname(els.joinNickname.value));
}

async function enterRoom(roomCode, nickname, options = {}) {
  const client = getClient();
  if (!client) {
    toast("请先填写 Supabase 配置");
    return;
  }

  setLoading(true);
  try {
    const roomResult = await client.from("rooms").select("*").eq("room_code", roomCode).maybeSingle();
    if (roomResult.error) throw roomResult.error;
    if (!roomResult.data) {
      toast("房间不存在");
      return;
    }

    const room = roomResult.data;
    const membersResult = await client.from("room_members").select("*").eq("room_id", room.id);
    if (membersResult.error) throw membersResult.error;
    const members = membersResult.data || [];
    const existingMember = members.find((member) => member.device_id === deviceId);

    if (!existingMember && !options.skipCapacityCheck && members.length >= room.max_members) {
      toast("房间人数已满");
      return;
    }

    if (existingMember) {
      const update = await client
        .from("room_members")
        .update({ nickname, last_seen_at: new Date().toISOString() })
        .eq("room_id", room.id)
        .eq("device_id", deviceId);
      if (update.error) throw update.error;
    } else {
      const insert = await client.from("room_members").insert({
        room_id: room.id,
        device_id: deviceId,
        nickname,
        role: room.owner_id === deviceId ? "owner" : "member",
      });
      if (insert.error) throw insert.error;
      if (options.announceJoin !== false) {
        await addEvent("member_joined", { nickname }, room.id, nickname);
      }
    }

    await loadRoomSnapshot(room.id);
    showRoom();
    saveLocalSession({ room_code: roomCode, nickname });
    subscribeToRoom(room.id);
    setSyncStatus("实时同步中");
  } catch (error) {
    console.error(error);
    toast("加入房间失败，请稍后再试");
  } finally {
    setLoading(false);
  }
}

async function loadRoomSnapshot(roomId = state.room?.id) {
  if (!roomId) return;
  const client = getClient();
  if (!client) return;

  const [roomResult, membersResult, dishesResult, votesResult, menuResult, eventsResult] = await Promise.all([
    client.from("rooms").select("*").eq("id", roomId).single(),
    client.from("room_members").select("*").eq("room_id", roomId).order("joined_at", { ascending: true }),
    client.from("dishes").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
    client.from("votes").select("*").eq("room_id", roomId),
    client.from("menu_items").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
    client.from("room_events").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(30),
  ]);

  const error = [roomResult, membersResult, dishesResult, votesResult, menuResult, eventsResult].find((item) => item.error)?.error;
  if (error) throw error;

  state.room = roomResult.data;
  state.members = membersResult.data || [];
  state.dishes = dishesResult.data || [];
  state.votes = votesResult.data || [];
  state.menuItems = menuResult.data || [];
  state.events = eventsResult.data || [];
  state.activeCategory = state.room.selected_category || "全部";
  state.activeMood = state.room.selected_status || "都可以";
  state.me = state.members.find((member) => member.device_id === deviceId) || null;
  saveLocalSession();
  render();
}

function subscribeToRoom(roomId) {
  const client = getClient();
  if (!client) return;
  if (realtimeChannel) client.removeChannel(realtimeChannel);

  realtimeChannel = client
    .channel(`room-${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => {
      loadRoomSnapshot(roomId).catch(handleRealtimeError);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, () => {
      loadRoomSnapshot(roomId).catch(handleRealtimeError);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "dishes", filter: `room_id=eq.${roomId}` }, () => {
      loadRoomSnapshot(roomId).catch(handleRealtimeError);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` }, () => {
      loadRoomSnapshot(roomId).catch(handleRealtimeError);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `room_id=eq.${roomId}` }, () => {
      loadRoomSnapshot(roomId).catch(handleRealtimeError);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_events", filter: `room_id=eq.${roomId}` }, (payload) => {
      handleRoomEvent(payload.new);
      loadRoomSnapshot(roomId).catch(handleRealtimeError);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setSyncStatus("实时同步中");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSyncStatus("当前可能不是最新数据", true);
    });
}

function handleRealtimeError(error) {
  console.error(error);
  setSyncStatus("当前可能不是最新数据", true);
}

function handleRoomEvent(event) {
  if (!event || event.actor_id === deviceId) return;
  toast(eventToMessage(event));
}

function eventToMessage(event) {
  const actor = event.actor_name || "有人";
  const payload = event.payload || {};
  const dish = payload.dish_name || payload.name || "这道菜";
  const map = {
    menu_added: `${actor}加入了 ${dish} 到今晚菜单`,
    menu_removed: `${actor}移除了 ${dish}`,
    vote_changed: `${actor}给 ${dish} 投了一票`,
    budget_updated: `${actor}更新了预算`,
    note_updated: `${actor}更新了备注`,
    dish_added: `${actor}添加了 ${dish}`,
    random_decided: `${actor}随机选中了 ${dish}`,
    member_joined: `${actor}加入了房间`,
    menu_cleared: `${actor}清空了今晚菜单`,
  };
  return map[event.event_type] || `${actor}更新了房间`;
}

async function addEvent(eventType, payload = {}, roomId = state.room?.id, actorName = state.me?.nickname) {
  const client = getClient();
  if (!client || !roomId) return;
  const result = await client.from("room_events").insert({
    room_id: roomId,
    actor_id: deviceId,
    actor_name: actorName || "我",
    event_type: eventType,
    payload,
  });
  if (result.error) console.warn("记录事件失败", result.error);
}

function allDishes() {
  return state.dishes.length ? state.dishes : starterDishes;
}

function byId(id) {
  return allDishes().find((dish) => dish.id === id);
}

function getMemberName(memberId) {
  return state.members.find((member) => member.device_id === memberId)?.nickname || "成员";
}

function formatMoney(value) {
  return `¥${Math.round(Number(value) || 0)}`;
}

function dishScore(dish) {
  const voteCount = state.votes.filter((vote) => vote.dish_id === dish.id && vote.vote_value > 0).length;
  let score = 1 + voteCount * 2;
  if (dish.status === state.activeMood) score += 1;
  if (state.menuItems.some((item) => item.dish_id === dish.id)) score -= 1;
  return score;
}

function getFilteredDishes() {
  return allDishes()
    .filter((dish) => state.activeCategory === "全部" || dish.category === state.activeCategory)
    .filter((dish) => state.activeMood === "都可以" || dish.status === state.activeMood)
    .sort((a, b) => dishScore(b) - dishScore(a) || Number(a.price) - Number(b.price));
}

function getMatchScore() {
  const activeMembers = state.members.map((member) => member.device_id);
  if (!activeMembers.length) return 0;
  const votedDishIds = [...new Set(state.votes.filter((vote) => vote.vote_value > 0).map((vote) => vote.dish_id))];
  if (!votedDishIds.length) return 0;
  const fullMatches = votedDishIds.filter((dishId) => {
    const voters = new Set(state.votes.filter((vote) => vote.dish_id === dishId && vote.vote_value > 0).map((vote) => vote.member_device_id));
    return activeMembers.every((memberId) => voters.has(memberId));
  });
  return Math.round((fullMatches.length / votedDishIds.length) * 100);
}

function renderMoodChips() {
  els.moodChips.innerHTML = moods
    .map(
      (mood) => `
        <button class="chip ${state.activeMood === mood ? "active" : ""}" type="button" data-mood="${escapeHtml(mood)}">
          ${escapeHtml(mood)}
        </button>
      `,
    )
    .join("");
}

function renderCategoryTabs() {
  els.categoryTabs.innerHTML = categories
    .map(
      (category) => `
        <button class="mini-pill ${state.activeCategory === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
          ${escapeHtml(category)}
        </button>
      `,
    )
    .join("");
}

function renderDishGrid() {
  const dishes = getFilteredDishes();
  els.dishGrid.innerHTML = dishes.length ? dishes.map(renderDishCard).join("") : `<div class="empty-state">今晚换个口味吧</div>`;
}

function renderRandomResult() {
  const result = state.room?.random_result;
  if (!result?.dish_name) {
    els.randomResultBar.hidden = true;
    els.randomResultBar.textContent = "";
    return;
  }
  els.randomResultBar.hidden = false;
  els.randomResultBar.textContent = `最新随机结果：${result.dish_name}`;
}

function renderDishCard(dish) {
  const voted = state.votes.some((vote) => vote.dish_id === dish.id && vote.member_device_id === deviceId && vote.vote_value > 0);
  const inMenu = state.menuItems.some((item) => item.dish_id === dish.id);
  const voteCount = state.votes.filter((vote) => vote.dish_id === dish.id && vote.vote_value > 0).length;
  return `
    <article class="dish-card">
      <div class="dish-visual" aria-hidden="true">${dish.emoji || "🍽️"}</div>
      <div class="dish-body">
        <div class="dish-name-row">
          <strong class="dish-name">${escapeHtml(dish.name)}</strong>
          <span class="dish-price">${formatMoney(dish.price)}</span>
        </div>
        <div class="dish-meta">
          <span>${escapeHtml(dish.category)}</span>
          <span>${escapeHtml(dish.status || "省心")}</span>
          <span>${escapeHtml(dish.spice || "自定")}</span>
          <span>${voteCount} 票</span>
        </div>
        <div class="dish-actions">
          <button class="vote-button ${voted ? "active" : ""}" type="button" data-vote="${dish.id}">
            ${voted ? "已投票" : "投一票"}
          </button>
          <button class="add-button" type="button" data-add="${dish.id}" aria-label="${inMenu ? "已加入" : "加入菜单"}">
            ${inMenu ? "✓" : "+"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderMembers() {
  const isOwner = state.room?.owner_id === deviceId;
  els.memberList.innerHTML = state.members.length
    ? state.members
        .map(
          (member) => `
            <div class="member-item">
              <div>
                <strong>${escapeHtml(member.nickname)}</strong>
                <div class="member-meta">${member.device_id === state.room?.owner_id ? "房主" : "成员"}${member.device_id === deviceId ? " · 我" : ""}</div>
              </div>
              ${
                isOwner && member.device_id !== deviceId
                  ? `<button class="remove-button" type="button" data-remove-member="${member.device_id}" aria-label="移除成员">×</button>`
                  : ""
              }
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">还没有成员</div>`;
}

function renderVotes() {
  els.voteBoard.innerHTML = state.members.length
    ? state.members
        .map((member) => {
          const ids = state.votes.filter((vote) => vote.member_device_id === member.device_id && vote.vote_value > 0).map((vote) => vote.dish_id);
          return `
            <div class="member-vote-card">
              <div>
                <strong>${escapeHtml(member.nickname)}</strong>
                <div class="mini-list">${renderVoteList(ids)}</div>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">还没有投票</div>`;
}

function renderVoteList(ids) {
  const items = ids.map(byId).filter(Boolean);
  if (!items.length) return `<div class="member-meta">还没投票</div>`;
  return items.map((dish) => `<div class="member-meta">${dish.emoji || "🍽️"} ${escapeHtml(dish.name)}</div>`).join("");
}

function renderOrder() {
  const items = state.menuItems.map((item) => ({ menuItem: item, dish: byId(item.dish_id) })).filter((item) => item.dish);
  const total = items.reduce((sum, item) => sum + Number(item.dish.price || 0), 0);
  const diff = Number(state.room?.budget || 0) - total;
  const match = getMatchScore();

  els.orderTotal.textContent = formatMoney(total);
  els.budgetDiff.textContent = diff >= 0 ? `+${formatMoney(diff)}` : `-${formatMoney(Math.abs(diff))}`;
  els.matchScore.textContent = `${match}%`;
  els.statMatch.textContent = `默契值 ${match}%`;
  els.statBudget.textContent = `预算 ${formatMoney(state.room?.budget || 0)}`;
  els.statCount.textContent = `${items.length} 道菜`;

  els.orderList.innerHTML = items.length
    ? items
        .map(
          ({ menuItem, dish }) => `
            <div class="order-item">
              <span>${dish.emoji || "🍽️"} ${escapeHtml(dish.name)}</span>
              <strong>${formatMoney(dish.price)}</strong>
              <button class="remove-button" type="button" data-remove="${menuItem.id}" aria-label="移除">×</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">菜单还是空的</div>`;
}

function renderHistory() {
  els.historyList.innerHTML = state.events.length
    ? state.events
        .slice(0, 12)
        .map(
          (event) => `
            <div class="history-item">
              <span>${escapeHtml(eventToMessage(event))}</span>
              <time>${formatTime(event.created_at)}</time>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">还没有历史记录</div>`;
}

function renderFormOptions() {
  els.newDishCategory.innerHTML = categories
    .filter((category) => category !== "全部")
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
}

function renderTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === state.activeTab);
  });
}

function renderInputs() {
  isRenderingInputs = true;
  els.roomCodeLabel.textContent = state.room?.room_code || "--";
  els.roomTitle.textContent = state.room?.display_name || "今晚吃什么";
  els.meLabel.textContent = state.me?.nickname || "--";
  els.memberCount.textContent = state.members.length;
  els.memberLimit.textContent = state.room?.max_members || 2;
  els.meName.value = state.me?.nickname || "";
  els.budgetInput.value = state.room?.budget || 0;
  els.orderNote.value = state.room?.note || "";
  els.roomNameInput.value = state.room?.display_name || "今晚吃什么";
  els.maxMembersInput.value = state.room?.max_members || 2;
  const isOwner = state.room?.owner_id === deviceId;
  els.ownerTools.hidden = !isOwner;
  isRenderingInputs = false;
}

function render() {
  if (!state.room) return;
  renderTabs();
  renderInputs();
  renderMembers();
  renderRandomResult();
  renderMoodChips();
  renderCategoryTabs();
  renderDishGrid();
  renderVotes();
  renderOrder();
  renderHistory();
}

async function updateRoom(patch, eventType, payload) {
  const client = getClient();
  if (!client || !state.room) return;
  const result = await client
    .from("rooms")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", state.room.id)
    .select()
    .single();
  if (result.error) {
    console.error(result.error);
    toast("更新失败，请稍后再试");
    return;
  }
  state.room = result.data;
  saveLocalSession();
  render();
  if (eventType) await addEvent(eventType, payload);
}

async function toggleVote(id) {
  const client = getClient();
  const dish = byId(id);
  if (!client || !state.room || !dish) return;
  const existing = state.votes.find((vote) => vote.dish_id === id && vote.member_device_id === deviceId);

  if (existing) {
    const nextValue = existing.vote_value > 0 ? 0 : 1;
    const result = await client
      .from("votes")
      .update({ vote_value: nextValue, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (result.error) {
      toast("投票失败，请稍后再试");
      return;
    }
    if (nextValue > 0) await addEvent("vote_changed", { dish_id: id, dish_name: dish.name });
  } else {
    const result = await client.from("votes").insert({
      room_id: state.room.id,
      dish_id: id,
      member_device_id: deviceId,
      vote_value: 1,
    });
    if (result.error) {
      toast("投票失败，请稍后再试");
      return;
    }
    await addEvent("vote_changed", { dish_id: id, dish_name: dish.name });
  }
  await loadRoomSnapshot();
}

async function addToOrder(id) {
  const client = getClient();
  const dish = byId(id);
  if (!client || !state.room || !dish) return;
  if (state.menuItems.some((item) => item.dish_id === id)) {
    toast("菜单里已经有它");
    return;
  }
  const result = await client.from("menu_items").insert({
    room_id: state.room.id,
    dish_id: id,
    added_by: deviceId,
  });
  if (result.error) {
    toast("加入菜单失败，请稍后再试");
    return;
  }
  await addEvent("menu_added", { dish_id: id, dish_name: dish.name });
  await loadRoomSnapshot();
}

async function removeFromOrder(menuItemId) {
  const client = getClient();
  if (!client || !state.room) return;
  const menuItem = state.menuItems.find((item) => item.id === menuItemId);
  const dish = menuItem ? byId(menuItem.dish_id) : null;
  const result = await client.from("menu_items").delete().eq("id", menuItemId).eq("room_id", state.room.id);
  if (result.error) {
    toast("移除失败，请稍后再试");
    return;
  }
  if (dish) await addEvent("menu_removed", { dish_id: dish.id, dish_name: dish.name });
  await loadRoomSnapshot();
}

async function chooseDecision() {
  const candidates = getFilteredDishes();
  if (!candidates.length) {
    toast("先加几个想吃的");
    return;
  }

  const weighted = candidates.flatMap((dish) => Array.from({ length: Math.max(1, dishScore(dish)) }, () => dish));
  const dish = weighted[Math.floor(Math.random() * weighted.length)];
  selectedDecisionId = dish.id;
  showDecision(dish);
  await updateRoom({ random_result: { dish_id: dish.id, dish_name: dish.name, decided_at: new Date().toISOString() } }, "random_decided", {
    dish_id: dish.id,
    dish_name: dish.name,
  });
}

function showDecision(dish) {
  els.decisionDish.innerHTML = `
    <div class="emoji" aria-hidden="true">${dish.emoji || "🍽️"}</div>
    <strong>${escapeHtml(dish.name)}</strong>
    <span>${escapeHtml(dish.category)} · ${escapeHtml(dish.status || "省心")} · ${formatMoney(dish.price)}</span>
  `;
  els.decisionModal.classList.add("open");
  els.decisionModal.setAttribute("aria-hidden", "false");
}

function closeDecision() {
  els.decisionModal.classList.remove("open");
  els.decisionModal.setAttribute("aria-hidden", "true");
}

async function addCustomDish(event) {
  event.preventDefault();
  const client = getClient();
  if (!client || !state.room) return;
  const name = els.newDishName.value.trim();
  if (!name) return;
  const dish = {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    room_id: state.room.id,
    name,
    category: els.newDishCategory.value,
    price: Math.max(0, Number(els.newDishPrice.value) || 0),
    status: state.activeMood === "都可以" ? "省心" : state.activeMood,
    spice: "自定",
    emoji: "🍽️",
    is_custom: true,
    created_by: deviceId,
  };
  const result = await client.from("dishes").insert(dish);
  if (result.error) {
    toast("添加菜品失败，请稍后再试");
    return;
  }
  els.newDishName.value = "";
  await updateRoom({ selected_category: dish.category }, "dish_added", { dish_id: dish.id, dish_name: dish.name });
  await loadRoomSnapshot();
}

async function removeMember(memberDeviceId) {
  if (state.room?.owner_id !== deviceId) return;
  const client = getClient();
  const result = await client.from("room_members").delete().eq("room_id", state.room.id).eq("device_id", memberDeviceId);
  if (result.error) {
    toast("移除成员失败");
    return;
  }
  await loadRoomSnapshot();
}

async function clearMenu() {
  if (state.room?.owner_id !== deviceId) return;
  const client = getClient();
  const result = await client.from("menu_items").delete().eq("room_id", state.room.id);
  if (result.error) {
    toast("清空菜单失败");
    return;
  }
  await addEvent("menu_cleared", {});
  await loadRoomSnapshot();
}

function leaveRoom() {
  if (realtimeChannel && supabaseClient) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = null;
  state.room = null;
  state.me = null;
  showLobby();
}

function toast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 3000);
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function debounce(fn, wait, timerName) {
  window.clearTimeout(window[timerName]);
  window[timerName] = window.setTimeout(fn, wait);
}

function bindEvents() {
  els.createRoomForm.addEventListener("submit", createRoom);
  els.joinRoomForm.addEventListener("submit", joinRoom);
  els.leaveRoomBtn.addEventListener("click", leaveRoom);

  document.querySelector(".tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    state.activeTab = button.dataset.tab;
    renderTabs();
  });

  els.moodChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mood]");
    if (!button) return;
    state.activeMood = button.dataset.mood;
    updateRoom({ selected_status: state.activeMood });
  });

  els.categoryTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.activeCategory = button.dataset.category;
    updateRoom({ selected_category: state.activeCategory });
  });

  els.dishGrid.addEventListener("click", (event) => {
    const voteButton = event.target.closest("[data-vote]");
    const addButton = event.target.closest("[data-add]");
    if (voteButton) toggleVote(voteButton.dataset.vote);
    if (addButton) addToOrder(addButton.dataset.add);
  });

  els.orderList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (button) removeFromOrder(button.dataset.remove);
  });

  els.memberList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-member]");
    if (button) removeMember(button.dataset.removeMember);
  });

  els.meName.addEventListener("input", () => {
    if (isRenderingInputs) return;
    const nickname = normalizeNickname(els.meName.value);
    window.clearTimeout(nicknameTimer);
    nicknameTimer = window.setTimeout(async () => {
      const client = getClient();
      if (!client || !state.room) return;
      const result = await client
        .from("room_members")
        .update({ nickname, last_seen_at: new Date().toISOString() })
        .eq("room_id", state.room.id)
        .eq("device_id", deviceId);
      if (!result.error) await loadRoomSnapshot();
    }, 450);
  });

  els.budgetInput.addEventListener("input", () => {
    if (isRenderingInputs) return;
    window.clearTimeout(budgetTimer);
    budgetTimer = window.setTimeout(() => {
      updateRoom({ budget: Math.max(0, Number(els.budgetInput.value) || 0) }, "budget_updated", {});
    }, 500);
  });

  els.orderNote.addEventListener("input", () => {
    if (isRenderingInputs) return;
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => {
      updateRoom({ note: els.orderNote.value }, "note_updated", {});
    }, 700);
  });

  els.roomNameInput.addEventListener("input", () => {
    if (isRenderingInputs || state.room?.owner_id !== deviceId) return;
    window.clearTimeout(roomSettingsTimer);
    roomSettingsTimer = window.setTimeout(() => {
      updateRoom({ display_name: els.roomNameInput.value.trim() || "今晚吃什么" });
    }, 500);
  });

  els.maxMembersInput.addEventListener("input", () => {
    if (isRenderingInputs || state.room?.owner_id !== deviceId) return;
    window.clearTimeout(roomSettingsTimer);
    roomSettingsTimer = window.setTimeout(() => {
      const nextMax = Math.max(clampMaxMembers(els.maxMembersInput.value), state.members.length);
      updateRoom({ max_members: nextMax });
    }, 500);
  });

  els.shuffleMood.addEventListener("click", () => {
    const nextMood = moods[Math.floor(Math.random() * moods.length)];
    state.activeMood = nextMood;
    updateRoom({ selected_status: nextMood });
  });

  els.decideBtn.addEventListener("click", chooseDecision);
  els.againDecision.addEventListener("click", chooseDecision);
  els.closeDecision.addEventListener("click", closeDecision);
  els.decisionModal.addEventListener("click", (event) => {
    if (event.target === els.decisionModal) closeDecision();
  });
  els.addDecision.addEventListener("click", () => {
    if (selectedDecisionId) addToOrder(selectedDecisionId);
    closeDecision();
  });

  els.clearRoomMenu.addEventListener("click", clearMenu);
  els.addDishForm.addEventListener("submit", addCustomDish);

  window.addEventListener("online", () => {
    if (state.room) loadRoomSnapshot().then(() => setSyncStatus("实时同步中")).catch(handleRealtimeError);
  });
  window.addEventListener("offline", () => setSyncStatus("当前可能不是最新数据", true));
}

async function boot() {
  renderFormOptions();
  bindEvents();

  const saved = loadLocalSession();
  els.createNickname.value = saved.nickname || "";
  els.joinNickname.value = saved.nickname || "";
  els.joinRoomCode.value = saved.room_code || "";
  els.configWarning.hidden = isSupabaseReady();

  if (!isSupabaseReady()) {
    restoreCachedRoom();
    if (!state.room) showLobby();
    return;
  }

  if (saved.room_code && saved.nickname) {
    restoreCachedRoom();
    await enterRoom(saved.room_code, saved.nickname, { skipCapacityCheck: true, announceJoin: false });
  } else {
    showLobby();
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

boot();
