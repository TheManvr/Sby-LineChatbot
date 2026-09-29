const RICH_MENU_NAME = "SBY Chatbot Modes v4";
const RICH_MENU_IMAGE_TYPE = "image/png";

const MODE_MENU_ACTIONS = [
  {
    label: "คำถามทั่วไป",
    data: "mode=general",
  },
  {
    label: "ทุนช้างเผือก",
    data: "mode=scholarship",
  },
  {
    label: "ติดต่อแอดมิน",
    data: "mode=admin",
  },
];

const RICH_MENU_REQUEST = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: RICH_MENU_NAME,
  chatBarText: "เลือกโหมดการคุย",
  areas: MODE_MENU_ACTIONS.map((item, index) => ({
    bounds: {
      x: index * 833,
      y: 0,
      width: index === 2 ? 834 : 833,
      height: 1686,
    },
    action: {
      label: item.label,
      type: "postback",
      data: item.data,
      inputOption: "openKeyboard",
    },
  })),
};

function createRichMenuRequest() {
  return structuredClone(RICH_MENU_REQUEST);
}

async function ensureModeRichMenu(client, imageBuffer, options = {}) {
  const list = await client.getRichMenuList();
  const existing = (list.richmenus ?? []).find(
    (menu) => menu.name === RICH_MENU_NAME
  );
  let richMenuId = existing?.richMenuId;
  let created = false;

  if (!richMenuId) {
    const response = await client.createRichMenu(createRichMenuRequest());
    richMenuId = response.richMenuId;
    created = true;
  }

  const imageClient = options.imageClient ?? client;
  try {
    await imageClient.setRichMenuImage(
      richMenuId,
      new Blob([imageBuffer], { type: RICH_MENU_IMAGE_TYPE })
    );
  } catch (error) {
    const details = `${error.message ?? ""} ${error.body ?? ""}`;
    if (!details.includes("already been uploaded")) throw error;
  }
  await client.setDefaultRichMenu(richMenuId);
  return { richMenuId, created };
}

module.exports = {
  MODE_MENU_ACTIONS,
  RICH_MENU_IMAGE_TYPE,
  RICH_MENU_NAME,
  RICH_MENU_REQUEST,
  createRichMenuRequest,
  ensureModeRichMenu,
};

