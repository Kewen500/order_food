const STORAGE_KEY = "couple-food-realtime-v2";
const DEVICE_KEY = "couple-food-device-id";
const ROOM_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const categories = ["全部", "中餐", "日料", "韩餐", "西餐", "火锅", "小吃", "甜品", "饮品"];
const tasteOptions = ["清香", "微辣", "中辣", "爆辣", "麻辣"];
const drinkOptions = ["热", "冷"];
const drinkKeywords = ["饮品", "饮料", "drink", "drinks", "beverage", "tea", "coffee", "奶茶", "咖啡"];

const starterDishes = [
  { id: "beef-noodle", name: "牛肉面", category: "中餐", price: 32, emoji: "🍜" },
  { id: "claypot-rice", name: "煲仔饭", category: "中餐", price: 38, emoji: "🍚" },
  { id: "hotpot", name: "鸳鸯火锅", category: "火锅", price: 128, emoji: "🥘" },
  { id: "sushi", name: "寿司拼盘", category: "日料", price: 68, emoji: "🍣" },
  { id: "ramen", name: "豚骨拉面", category: "日料", price: 45, emoji: "🍜" },
  { id: "bibimbap", name: "石锅拌饭", category: "韩餐", price: 42, emoji: "🍲" },
  { id: "fried-chicken", name: "韩式炸鸡", category: "韩餐", price: 58, emoji: "🍗" },
  { id: "steak", name: "小牛排", category: "西餐", price: 98, emoji: "🥩" },
  { id: "pizza", name: "薄底披萨", category: "西餐", price: 72, emoji: "🍕" },
  { id: "dumpling", name: "鲜肉锅贴", category: "小吃", price: 26, emoji: "🥟" },
  { id: "mala-tang", name: "麻辣烫", category: "小吃", price: 36, emoji: "🍢" },
  { id: "salad", name: "鸡胸沙拉", category: "西餐", price: 39, emoji: "🥗" },
  { id: "congee", name: "皮蛋瘦肉粥", category: "中餐", price: 24, emoji: "🥣" },
  { id: "cake", name: "草莓蛋糕", category: "甜品", price: 36, emoji: "🍰" },
  { id: "milk-tea", name: "珍珠奶茶", category: "饮品", price: 18, emoji: "🧋" },
  { id: "lemon-tea", name: "柠檬茶", category: "饮品", price: 16, emoji: "🍋" },
];

const state = {
  activeTab: "pick",
  activeCategory: "全部",
  room: null,
  me: null,
  members: [],
  dishes: [],
  menuItems: [],
  events: [],
  loading: false,
};

const deviceId = getOrCreateDeviceId();
let supabaseClient = null;
let realtimeChannel = null;
let selectedDecisionId = null;
let pendingOptionDishId = null;
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
  statBudget: document.querySelector("#statBudget"),
  statCount: document.querySelector("#statCount"),
  statMembers: document.querySelector("#statMembers"),
  memberCount: document.querySelector("#memberCount"),
  memberLimit: document.querySelector("#memberLimit"),
  meLabel: document.querySelector("#meLabel"),
  syncStatus: document.querySelector("#syncStatus"),
  ownerTools: document.querySelector("#ownerTools"),
  clearRoomMenu: document.querySelector("#clearRoomMenu"),
  roomNameInput: document.querySelector("#roomNameInput"),
  maxMembersInput: document.querySelector("#maxMembersInput"),
  memberList: document.querySelector("#memberList"),
  meName: document.querySelector("#meName"),
  budgetInput: document.querySelector("#budgetInput"),
  categoryTabs: document.querySelector("#categoryTabs"),
  randomResultBar: document.querySelector("#randomResultBar"),
  dishGrid: document.querySelector("#dishGrid"),
  decideBtn: document.querySelector("#decideBtn"),
  openAddDish: document.querySelector("#openAddDish"),
  openDeleteDish: document.querySelector("#openDeleteDish"),
  addDishModal: document.querySelector("#addDishModal"),
  addDishForm: document.querySelector("#addDishForm"),
  closeAddDish: document.querySelector("#closeAddDish"),
  cancelAddDish: document.querySelector("#cancelAddDish"),
  newDishName: document.querySelector("#newDishName"),
  newDishCategory: document.querySelector("#newDishCategory"),
  categorySuggestions: document.querySelector("#categorySuggestions"),
  newDishPrice: document.querySelector("#newDishPrice"),
  optionModal: document.querySelector("#optionModal"),
  optionTitle: document.querySelector("#optionTitle"),
  optionDishName: document.querySelector("#optionDishName"),
  optionGrid: document.querySelector("#optionGrid"),
  closeOption: document.querySelector("#closeOption"),
  deleteDishModal: document.querySelector("#deleteDishModal"),
  closeDeleteDish: document.querySelector("#closeDeleteDish"),
  deleteDishList: document.querySelector("#deleteDishList"),
  orderTotal: document.querySelector("#orderTotal"),
  budgetDiff: document.querySelector("#budgetDiff"),
  orderCount: document.querySelector("#orderCount"),
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
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      device_id: deviceId,
      room_code: state.room?.room_code || extra.room_code || "",
      nickname: state.me?.nickname || extra.nickname || "",
      cached_room: state.room,
      cached_members: state.members,
      cached_dishes: state.dishes,
      cached_menu_items: state.menuItems,
      cached_events: state.events.slice(0, 30),
      ...extra,
    }),
  );
}

function clearRoomSession() {
  const saved = loadLocalSession();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      device_id: deviceId,
      nickname: saved.nickname || state.me?.nickname || "",
      room_code: "",
      cached_room: null,
      cached_members: [],
      cached_dishes: [],
      cached_menu_items: [],
      cached_events: [],
    }),
  );
}

function restoreCachedRoom() {
  const saved = loadLocalSession();
  if (!saved.cached_room) return;
  state.room = saved.cached_room;
  state.members = saved.cached_members || [];
  state.dishes = saved.cached_dishes || [];
  state.menuItems = saved.cached_menu_items || [];
  state.events = saved.cached_events || [];
  state.me = findMemberByNickname(saved.nickname) || state.members.find((member) => member.device_id === deviceId) || null;
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
  closeAddDishModal();
  closeOptionModal();
  closeDeleteDishModal();
}

function showRoom() {
  els.lobbyView.hidden = true;
  els.roomView.hidden = false;
}

function setLoading(loading) {
  state.loading = loading;
  document.querySelectorAll("button, input, textarea").forEach((node) => {
    node.disabled = loading;
  });
}

function setSyncStatus(text, offline = false) {
  els.syncStatus.textContent = text;
  els.syncStatus.classList.toggle("offline", offline);
}

function findMemberByNickname(nickname) {
  return state.members.find((member) => member.nickname === nickname);
}

function isCurrentOwner() {
  return state.room?.owner_id === state.me?.nickname || state.room?.owner_id === deviceId;
}

function hasEnteredRoom() {
  return Boolean(state.room?.id && state.me?.nickname && !els.roomView.hidden);
}

function requireEnteredRoom() {
  if (hasEnteredRoom()) return true;
  toast("请先创建或加入房间");
  return false;
}

async function createRoom(event) {
  event.preventDefault();
  const client = getClient();
  if (!client) return toast("请先填写 Supabase 配置");

  const roomCode = normalizeRoomCode(els.createRoomCode.value);
  const codeError = validateRoomCode(roomCode);
  if (codeError) return toast(codeError);

  const nickname = normalizeNickname(els.createNickname.value);
  const maxMembers = clampMaxMembers(els.createMaxMembers.value);
  setLoading(true);

  try {
    const existing = await client.from("rooms").select("id").eq("room_code", roomCode).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return toast("房间码已存在，请换一个");

    const roomInsert = await client
      .from("rooms")
      .insert({
        room_code: roomCode,
        display_name: "今晚吃什么",
        owner_id: nickname,
        max_members: maxMembers,
        budget: 120,
        selected_category: "全部",
        selected_status: "都可以",
        note: "",
      })
      .select()
      .single();
    if (roomInsert.error) throw roomInsert.error;

    const room = roomInsert.data;
    const memberInsert = await client.from("room_members").insert({
      room_id: room.id,
      device_id: deviceId,
      nickname,
      role: "owner",
    });
    if (memberInsert.error) throw memberInsert.error;

    const starterRows = starterDishes.map((dish) => ({
      ...dish,
      room_id: room.id,
      status: "默认",
      spice: "自定",
      is_custom: false,
      created_by: nickname,
    }));
    const dishesInsert = await client.from("dishes").insert(starterRows);
    if (dishesInsert.error) throw dishesInsert.error;

    await enterRoom(roomCode, nickname, { skipCapacityCheck: true, announceJoin: false });
  } catch (error) {
    console.error(error);
    toast(error.code === "23505" ? "房间码或昵称已存在" : "创建房间失败，请检查 Supabase 表结构");
  } finally {
    setLoading(false);
  }
}

async function joinRoom(event) {
  event.preventDefault();
  const roomCode = normalizeRoomCode(els.joinRoomCode.value);
  const codeError = validateRoomCode(roomCode);
  if (codeError) return toast(codeError);
  await enterRoom(roomCode, normalizeNickname(els.joinNickname.value));
}

async function enterRoom(roomCode, nickname, options = {}) {
  const client = getClient();
  if (!client) return toast("请先填写 Supabase 配置");

  setLoading(true);
  try {
    const roomResult = await client.from("rooms").select("*").eq("room_code", roomCode).maybeSingle();
    if (roomResult.error) throw roomResult.error;
    if (!roomResult.data) return toast("房间不存在");

    const room = roomResult.data;
    const membersResult = await client.from("room_members").select("*").eq("room_id", room.id);
    if (membersResult.error) throw membersResult.error;
    const members = membersResult.data || [];
    const existingByNickname = members.find((member) => member.nickname === nickname);

    if (existingByNickname) {
      const update = await client
        .from("room_members")
        .update({ device_id: deviceId, last_seen_at: new Date().toISOString() })
        .eq("room_id", room.id)
        .eq("nickname", nickname);
      if (update.error) throw update.error;
    } else {
      if (!options.skipCapacityCheck && members.length >= room.max_members) return toast("房间人数已满");
      const insert = await client.from("room_members").insert({
        room_id: room.id,
        device_id: deviceId,
        nickname,
        role: room.owner_id === nickname ? "owner" : "member",
      });
      if (insert.error) throw insert.error;
      if (options.announceJoin !== false) await addEvent("member_joined", { nickname }, room.id, nickname);
    }

    await loadRoomSnapshot(room.id, nickname);
    showRoom();
    saveLocalSession({ room_code: roomCode, nickname });
    subscribeToRoom(room.id);
    setSyncStatus("实时同步中");
  } catch (error) {
    console.error(error);
    toast(error.code === "23505" ? "这个昵称已经在房间里" : "加入房间失败，请稍后再试");
  } finally {
    setLoading(false);
  }
}

async function loadRoomSnapshot(roomId = state.room?.id, preferredNickname = state.me?.nickname) {
  if (!roomId) return;
  const client = getClient();
  if (!client) return;

  const [roomResult, membersResult, dishesResult, menuResult, eventsResult] = await Promise.all([
    client.from("rooms").select("*").eq("id", roomId).single(),
    client.from("room_members").select("*").eq("room_id", roomId).order("joined_at", { ascending: true }),
    client.from("dishes").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
    client.from("menu_items").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
    client.from("room_events").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(30),
  ]);

  const error = [roomResult, membersResult, dishesResult, menuResult, eventsResult].find((item) => item.error)?.error;
  if (error) throw error;

  state.room = roomResult.data;
  state.members = membersResult.data || [];
  state.dishes = dishesResult.data || [];
  state.menuItems = menuResult.data || [];
  state.events = eventsResult.data || [];
  state.activeCategory = state.room.selected_category || "全部";
  state.me = state.members.find((member) => member.nickname === preferredNickname) || state.members.find((member) => member.device_id === deviceId) || null;
  saveLocalSession({ nickname: state.me?.nickname || preferredNickname || "" });
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
  if (!event || event.actor_name === state.me?.nickname) return;
  toast(eventToMessage(event));
}

function eventToMessage(event) {
  const actor = event.actor_name || "有人";
  const payload = event.payload || {};
  const dish = payload.dish_name || payload.name || "这道菜";
  const option = payload.option_label ? `（${payload.option_label}）` : "";
  const map = {
    menu_added: `${actor}加入了 ${dish}${option}`,
    menu_removed: `${actor}移除了 ${dish}`,
    dish_added: `${actor}添加了 ${dish}`,
    dish_deleted: `${actor}删除了 ${dish}`,
    budget_updated: `${actor}更新了预算`,
    note_updated: `${actor}更新了备注`,
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
    actor_id: actorName || deviceId,
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

function formatMoney(value) {
  return `¥${Math.round(Number(value) || 0)}`;
}

function getFilteredDishes() {
  return allDishes()
    .filter((dish) => state.activeCategory === "全部" || dish.category === state.activeCategory)
    .sort((a, b) => Number(a.price) - Number(b.price) || a.name.localeCompare(b.name, "zh-CN"));
}

function getCategoryList() {
  return [...new Set([...categories, ...state.dishes.map((dish) => dish.category).filter(Boolean)])];
}

function isDrinkCategory(category = "") {
  const text = category.toLowerCase();
  return drinkKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function renderCategoryTabs() {
  els.categoryTabs.innerHTML = getCategoryList()
    .map(
      (category) => `
        <button class="mini-pill ${state.activeCategory === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
          ${escapeHtml(category)}
        </button>
      `,
    )
    .join("");
  els.categorySuggestions.innerHTML = getCategoryList()
    .filter((category) => category !== "全部")
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
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
  const inMenu = state.menuItems.some((item) => item.dish_id === dish.id);
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
        </div>
        <div class="dish-actions">
          <button class="add-button" type="button" data-add="${dish.id}">
            ${inMenu ? "再加一份" : "加入菜单"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderMembers() {
  const owner = isCurrentOwner();
  els.memberList.innerHTML = state.members.length
    ? state.members
        .map(
          (member) => `
            <div class="member-item">
              <div>
                <strong>${escapeHtml(member.nickname)}</strong>
                <div class="member-meta">${member.nickname === state.room?.owner_id || member.role === "owner" ? "房主" : "成员"}${member.nickname === state.me?.nickname ? " · 我" : ""}</div>
              </div>
              ${
                owner && member.nickname !== state.me?.nickname
                  ? `<button class="remove-button" type="button" data-remove-member="${escapeHtml(member.nickname)}" aria-label="移除成员">×</button>`
                  : ""
              }
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">还没有成员</div>`;
}

function renderOrder() {
  const items = state.menuItems.map((item) => ({ menuItem: item, dish: byId(item.dish_id) })).filter((item) => item.dish);
  const total = items.reduce((sum, item) => sum + Number(item.dish.price || 0), 0);
  const diff = Number(state.room?.budget || 0) - total;

  els.orderTotal.textContent = formatMoney(total);
  els.budgetDiff.textContent = diff >= 0 ? `+${formatMoney(diff)}` : `-${formatMoney(Math.abs(diff))}`;
  els.orderCount.textContent = items.length;
  els.statBudget.textContent = `预算 ${formatMoney(state.room?.budget || 0)}`;
  els.statCount.textContent = `${items.length} 道菜`;
  els.statMembers.textContent = `${state.members.length} 人`;

  els.orderList.innerHTML = items.length
    ? items
        .map(({ menuItem, dish }) => {
          const option = menuItem.option_label || menuItem.selected_taste || menuItem.drink_temperature || "";
          return `
            <div class="order-item">
              <span>
                ${dish.emoji || "🍽️"} ${escapeHtml(dish.name)}
                ${option ? `<small>（${escapeHtml(option)}）</small>` : ""}
                <small>由 ${escapeHtml(menuItem.added_by || "成员")} 添加</small>
              </span>
              <strong>${formatMoney(dish.price)}</strong>
              <button class="remove-button" type="button" data-remove="${menuItem.id}" aria-label="移除">×</button>
            </div>
          `;
        })
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
  els.ownerTools.hidden = !isCurrentOwner();
  isRenderingInputs = false;
}

function render() {
  if (!state.room) return;
  renderTabs();
  renderInputs();
  renderMembers();
  renderRandomResult();
  renderCategoryTabs();
  renderDishGrid();
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

function openOptionModal(dishId) {
  if (!requireEnteredRoom()) return;
  const dish = byId(dishId);
  if (!dish) return;
  pendingOptionDishId = dishId;
  const options = isDrinkCategory(dish.category) ? drinkOptions : tasteOptions;
  els.optionTitle.textContent = isDrinkCategory(dish.category) ? "选择冷热" : "选择口味";
  els.optionDishName.textContent = dish.name;
  els.optionGrid.innerHTML = options.map((option) => `<button class="option-button" type="button" data-option="${option}">${option}</button>`).join("");
  els.optionModal.classList.add("open");
  els.optionModal.setAttribute("aria-hidden", "false");
}

function closeOptionModal() {
  pendingOptionDishId = null;
  els.optionModal.classList.remove("open");
  els.optionModal.setAttribute("aria-hidden", "true");
}

async function addToOrderWithOption(optionLabel) {
  const client = getClient();
  const dish = byId(pendingOptionDishId);
  if (!client || !state.room || !dish) return;
  const isDrink = isDrinkCategory(dish.category);
  const result = await client.from("menu_items").insert({
    room_id: state.room.id,
    dish_id: dish.id,
    added_by: state.me?.nickname || "成员",
    option_label: optionLabel,
    selected_taste: isDrink ? null : optionLabel,
    drink_temperature: isDrink ? optionLabel : null,
  });
  if (result.error) {
    toast("加入菜单失败，请先执行数据库迁移 SQL");
    console.error(result.error);
    return;
  }
  await addEvent("menu_added", {
    dish_id: dish.id,
    dish_name: dish.name,
    option_label: optionLabel,
    selected_taste: isDrink ? null : optionLabel,
    drink_temperature: isDrink ? optionLabel : null,
  });
  closeOptionModal();
  await loadRoomSnapshot();
}

async function removeFromOrder(menuItemId) {
  const client = getClient();
  if (!client || !state.room) return;
  const menuItem = state.menuItems.find((item) => item.id === menuItemId);
  const dish = menuItem ? byId(menuItem.dish_id) : null;
  const result = await client.from("menu_items").delete().eq("id", menuItemId).eq("room_id", state.room.id);
  if (result.error) return toast("移除失败，请稍后再试");
  if (dish) await addEvent("menu_removed", { dish_id: dish.id, dish_name: dish.name });
  await loadRoomSnapshot();
}

async function deleteDish(dishId) {
  const client = getClient();
  const dish = byId(dishId);
  if (!client || !state.room || !dish) return;
  const inMenu = state.menuItems.some((item) => item.dish_id === dishId);
  const message = inMenu ? "该菜品已在今晚菜单中，删除后会从今晚菜单移除。确定删除这个菜品吗？" : "确定删除这个菜品吗？";
  if (!window.confirm(message)) return;

  const result = await client.from("dishes").delete().eq("room_id", state.room.id).eq("id", dishId);
  if (result.error) {
    console.error(result.error);
    toast("删除菜品失败，请确认已执行数据库迁移 SQL");
    return;
  }
  await addEvent("dish_deleted", { dish_id: dish.id, dish_name: dish.name });
  closeDeleteDishModal();
  await loadRoomSnapshot();
}

async function chooseDecision() {
  const candidates = getFilteredDishes();
  if (!candidates.length) return toast("先加几个想吃的");
  const dish = candidates[Math.floor(Math.random() * candidates.length)];
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
    <span>${escapeHtml(dish.category)} · ${formatMoney(dish.price)}</span>
  `;
  els.decisionModal.classList.add("open");
  els.decisionModal.setAttribute("aria-hidden", "false");
}

function closeDecision() {
  els.decisionModal.classList.remove("open");
  els.decisionModal.setAttribute("aria-hidden", "true");
}

function openAddDishModal() {
  if (!requireEnteredRoom()) return;
  els.addDishModal.classList.add("open");
  els.addDishModal.setAttribute("aria-hidden", "false");
  els.newDishName.focus();
}

function closeAddDishModal() {
  els.addDishModal.classList.remove("open");
  els.addDishModal.setAttribute("aria-hidden", "true");
}

function openDeleteDishModal() {
  if (!requireEnteredRoom()) return;
  renderDeleteDishList();
  els.deleteDishModal.classList.add("open");
  els.deleteDishModal.setAttribute("aria-hidden", "false");
}

function closeDeleteDishModal() {
  els.deleteDishModal.classList.remove("open");
  els.deleteDishModal.setAttribute("aria-hidden", "true");
}

function renderDeleteDishList() {
  const dishes = getFilteredDishes();
  els.deleteDishList.innerHTML = dishes.length
    ? dishes
        .map(
          (dish) => `
            <button class="delete-dish-row" type="button" data-delete-dish="${dish.id}">
              <span>${dish.emoji || "🍽️"} ${escapeHtml(dish.name)}</span>
              <strong>${formatMoney(dish.price)}</strong>
            </button>
          `,
        )
        .join("")
    : `<div class="empty-state">当前分类没有菜品</div>`;
}

async function addCustomDish(event) {
  event.preventDefault();
  if (!requireEnteredRoom()) return;
  const client = getClient();
  if (!client || !state.room) return;
  const name = els.newDishName.value.trim();
  if (!name) return;
  const category = els.newDishCategory.value.trim() || "自定义";
  const dish = {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    room_id: state.room.id,
    name,
    category,
    price: Math.max(0, Number(els.newDishPrice.value) || 0),
    status: "默认",
    spice: "自定",
    emoji: isDrinkCategory(category) ? "🥤" : "🍽️",
    is_custom: true,
    created_by: state.me?.nickname || "成员",
  };
  const result = await client.from("dishes").insert(dish);
  if (result.error) {
    console.error(result.error);
    toast("添加菜品失败，请稍后再试");
    return;
  }
  els.newDishName.value = "";
  els.newDishCategory.value = "";
  els.newDishPrice.value = "";
  closeAddDishModal();
  await updateRoom({ selected_category: dish.category }, "dish_added", { dish_id: dish.id, dish_name: dish.name });
  await loadRoomSnapshot();
}

async function removeMember(nickname) {
  if (!isCurrentOwner()) return;
  const client = getClient();
  const result = await client.from("room_members").delete().eq("room_id", state.room.id).eq("nickname", nickname);
  if (result.error) return toast("移除成员失败");
  await loadRoomSnapshot();
}

async function clearMenu() {
  if (!isCurrentOwner()) return;
  const client = getClient();
  const result = await client.from("menu_items").delete().eq("room_id", state.room.id);
  if (result.error) return toast("清空菜单失败");
  await addEvent("menu_cleared", {});
  await loadRoomSnapshot();
}

function leaveRoom() {
  if (realtimeChannel && supabaseClient) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = null;
  clearRoomSession();
  state.room = null;
  state.me = null;
  state.members = [];
  state.dishes = [];
  state.menuItems = [];
  state.events = [];
  els.joinRoomCode.value = "";
  showLobby();
  toast("已退出房间");
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

function bindEvents() {
  els.createRoomForm.addEventListener("submit", createRoom);
  els.joinRoomForm.addEventListener("submit", joinRoom);
  els.leaveRoomBtn.addEventListener("click", leaveRoom);
  els.openAddDish.addEventListener("click", openAddDishModal);
  els.openDeleteDish.addEventListener("click", openDeleteDishModal);
  els.closeAddDish.addEventListener("click", closeAddDishModal);
  els.cancelAddDish.addEventListener("click", closeAddDishModal);
  els.addDishForm.addEventListener("submit", addCustomDish);
  els.closeOption.addEventListener("click", closeOptionModal);
  els.closeDeleteDish.addEventListener("click", closeDeleteDishModal);

  document.querySelector(".tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    state.activeTab = button.dataset.tab;
    renderTabs();
  });

  els.categoryTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.activeCategory = button.dataset.category;
    updateRoom({ selected_category: state.activeCategory });
  });

  els.dishGrid.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    if (addButton) openOptionModal(addButton.dataset.add);
  });

  els.deleteDishList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-dish]");
    if (button) deleteDish(button.dataset.deleteDish);
  });

  els.optionGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (button) addToOrderWithOption(button.dataset.option);
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
    const nextNickname = normalizeNickname(els.meName.value);
    window.clearTimeout(nicknameTimer);
    nicknameTimer = window.setTimeout(async () => {
      const client = getClient();
      if (!client || !state.room || !state.me) return;
      const result = await client
        .from("room_members")
        .update({ nickname: nextNickname, last_seen_at: new Date().toISOString() })
        .eq("room_id", state.room.id)
        .eq("nickname", state.me.nickname);
      if (result.error) return toast("昵称已存在或更新失败");
      if (state.room.owner_id === state.me.nickname) await updateRoom({ owner_id: nextNickname });
      await loadRoomSnapshot(state.room.id, nextNickname);
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
    if (isRenderingInputs || !isCurrentOwner()) return;
    window.clearTimeout(roomSettingsTimer);
    roomSettingsTimer = window.setTimeout(() => {
      updateRoom({ display_name: els.roomNameInput.value.trim() || "今晚吃什么" });
    }, 500);
  });

  els.maxMembersInput.addEventListener("input", () => {
    if (isRenderingInputs || !isCurrentOwner()) return;
    window.clearTimeout(roomSettingsTimer);
    roomSettingsTimer = window.setTimeout(() => {
      const nextMax = Math.max(clampMaxMembers(els.maxMembersInput.value), state.members.length);
      updateRoom({ max_members: nextMax });
    }, 500);
  });

  els.decideBtn.addEventListener("click", chooseDecision);
  els.againDecision.addEventListener("click", chooseDecision);
  els.closeDecision.addEventListener("click", closeDecision);
  els.decisionModal.addEventListener("click", (event) => {
    if (event.target === els.decisionModal) closeDecision();
  });
  els.addDecision.addEventListener("click", () => {
    if (selectedDecisionId) openOptionModal(selectedDecisionId);
    closeDecision();
  });
  els.clearRoomMenu.addEventListener("click", clearMenu);

  [els.addDishModal, els.optionModal, els.deleteDishModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
      }
    });
  });

  window.addEventListener("online", () => {
    if (state.room) loadRoomSnapshot().then(() => setSyncStatus("实时同步中")).catch(handleRealtimeError);
  });
  window.addEventListener("offline", () => setSyncStatus("当前可能不是最新数据", true));
}

async function boot() {
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
