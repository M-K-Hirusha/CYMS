// CYMS realistic demonstration seed data.
// This file creates sample academic demonstration data only.
// It does not contain real company passwords or real confidential data.
// Do not use these demo credentials in production.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("./models/User");
const Yard = require("./models/Yard");
const Material = require("./models/Material");
const Stock = require("./models/Stock");
const StockMovement = require("./models/StockMovement");
const MR = require("./models/MR");
const MCR = require("./models/MaterialCreationRequest");
const Tool = require("./models/Tool");
const ToolMovement = require("./models/ToolMovement");
const Counter = require("./models/Counter");


dotenv.config();

async function seedDemoData() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    if (!process.env.MONGO_URI.includes("cyms_final_demo")) {
      throw new Error(
        "Safety stopped: MONGO_URI must point to cyms_final_demo before seeding."
      );
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    console.log("Clearing old data from cyms_final_demo...");

    await Promise.all([
      User.deleteMany({}),
      Yard.deleteMany({}),
      Material.deleteMany({}),
      Stock.deleteMany({}),
      StockMovement.deleteMany({}),
      MR.deleteMany({}),
      MCR.deleteMany({}),
      Tool.deleteMany({}),
      ToolMovement.deleteMany({}),
      Counter.deleteMany({}),
    ]);

    console.log("Creating yards...");

    const yards = await Yard.insertMany([
      {
        code: "MAIN_COLOMBO",
        name: "Main Yard Colombo",
        type: "MAIN",
        locations: [
          { name: "Main Store", code: "MAIN_STORE", isActive: true },
          { name: "Bulk Storage", code: "BULK_STORE", isActive: true },
        ],
        isActive: true,
      },
      {
        code: "MAIN_NEGOMBO",
        name: "Main Yard Negombo",
        type: "MAIN",
        locations: [
          { name: "Main Store", code: "MAIN_STORE", isActive: true },
          { name: "Tool Bay", code: "TOOL_BAY", isActive: true },
        ],
        isActive: true,
      },
      {
        code: "SITE_KANDY",
        name: "Site Yard Kandy - Apartment Project",
        type: "SITE",
        projectCode: "PRJ_KANDY_001",
        locations: [
          { name: "Site Store", code: "SITE_STORE", isActive: true },
          { name: "Open Storage", code: "OPEN_STORE", isActive: true },
        ],
        isActive: true,
      },
      {
        code: "SITE_GALLE",
        name: "Site Yard Galle - Hotel Renovation",
        type: "SITE",
        projectCode: "PRJ_GALLE_002",
        locations: [
          { name: "Site Store", code: "SITE_STORE", isActive: true },
          { name: "Finishing Store", code: "FINISH_STORE", isActive: true },
        ],
        isActive: true,
      },
      {
        code: "SITE_MATARA",
        name: "Site Yard Matara - Housing Scheme",
        type: "SITE",
        projectCode: "PRJ_MATARA_003",
        locations: [
          { name: "Site Store", code: "SITE_STORE", isActive: true },
          { name: "Steel Yard", code: "STEEL_YARD", isActive: true },
        ],
        isActive: true,
      },
      {
        code: "SITE_KURUNEGALA",
        name: "Site Yard Kurunegala - School Building",
        type: "SITE",
        projectCode: "PRJ_KURU_004",
        locations: [
          { name: "Site Store", code: "SITE_STORE", isActive: true },
          { name: "Material Shed", code: "MAT_SHED", isActive: true },
        ],
        isActive: true,
      },
      {
        code: "SITE_RATMALANA",
        name: "Site Yard Ratmalana - Warehouse Project",
        type: "SITE",
        projectCode: "PRJ_RATMALANA_005",
        locations: [
          { name: "Site Store", code: "SITE_STORE", isActive: true },
          { name: "Plant Area", code: "PLANT_AREA", isActive: true },
        ],
        isActive: true,
      },
      {
        code: "SITE_JAFFNA",
        name: "Site Yard Jaffna - Office Complex",
        type: "SITE",
        projectCode: "PRJ_JAFFNA_006",
        locations: [
          { name: "Site Store", code: "SITE_STORE", isActive: true },
          { name: "Secure Store", code: "SECURE_STORE", isActive: true },
        ],
        isActive: true,
      },
    ]);

    const yard = Object.fromEntries(yards.map((y) => [y.code, y]));

    console.log("Creating users...");

    const hash = async (password) => bcrypt.hash(password, 10);

    const systemAdmin = await User.create({
      fullName: "System Administrator",
      email: "system@cyms.com",
      passwordHash: await hash("Admin12345"),
      role: "SYSTEM_ADMIN",
      assignedYard: null,
      managedMainYards: [],
      isActive: true,
    });

    const headOfficeAdmin1 = await User.create({
      fullName: "Head Office Administrator - Operations",
      email: "headoffice@cyms.com",
      passwordHash: await hash("Head12345"),
      role: "HEAD_OFFICE_ADMIN",
      assignedYard: null,
      managedMainYards: [yard.MAIN_COLOMBO._id, yard.MAIN_NEGOMBO._id],
      isActive: true,
    });

    const headOfficeAdmin2 = await User.create({
      fullName: "Head Office Administrator - Procurement",
      email: "procurement@cyms.com",
      passwordHash: await hash("Procure12345"),
      role: "HEAD_OFFICE_ADMIN",
      assignedYard: null,
      managedMainYards: [yard.MAIN_COLOMBO._id],
      isActive: true,
    });

    const siteAdminData = [
      ["Kandy Site Administrator", "siteadmin.kandy@cyms.com", yard.SITE_KANDY._id],
      ["Galle Site Administrator", "siteadmin.galle@cyms.com", yard.SITE_GALLE._id],
      ["Matara Site Administrator", "siteadmin.matara@cyms.com", yard.SITE_MATARA._id],
      ["Kurunegala Site Administrator", "siteadmin.kurunegala@cyms.com", yard.SITE_KURUNEGALA._id],
      ["Ratmalana Site Administrator", "siteadmin.ratmalana@cyms.com", yard.SITE_RATMALANA._id],
      ["Jaffna Site Administrator", "siteadmin.jaffna@cyms.com", yard.SITE_JAFFNA._id],
    ];

    const siteAdmins = [];
    for (const [fullName, email, assignedYard] of siteAdminData) {
      siteAdmins.push(
        await User.create({
          fullName,
          email,
          passwordHash: await hash("Site12345"),
          role: "SITE_ADMIN",
          assignedYard,
          managedMainYards: [],
          isActive: true,
        })
      );
    }

    const siteStaffData = [
      ["Kandy Store Keeper", "staff.kandy.store@cyms.com", yard.SITE_KANDY._id],
      ["Kandy Site Supervisor", "staff.kandy.supervisor@cyms.com", yard.SITE_KANDY._id],
      ["Galle Store Keeper", "staff.galle.store@cyms.com", yard.SITE_GALLE._id],
      ["Galle Site Supervisor", "staff.galle.supervisor@cyms.com", yard.SITE_GALLE._id],
      ["Matara Store Keeper", "staff.matara.store@cyms.com", yard.SITE_MATARA._id],
      ["Matara Site Supervisor", "staff.matara.supervisor@cyms.com", yard.SITE_MATARA._id],
      ["Kurunegala Store Keeper", "staff.kurunegala.store@cyms.com", yard.SITE_KURUNEGALA._id],
      ["Kurunegala Site Supervisor", "staff.kurunegala.supervisor@cyms.com", yard.SITE_KURUNEGALA._id],
      ["Ratmalana Store Keeper", "staff.ratmalana.store@cyms.com", yard.SITE_RATMALANA._id],
      ["Ratmalana Site Supervisor", "staff.ratmalana.supervisor@cyms.com", yard.SITE_RATMALANA._id],
      ["Jaffna Store Keeper", "staff.jaffna.store@cyms.com", yard.SITE_JAFFNA._id],
      ["Jaffna Site Supervisor", "staff.jaffna.supervisor@cyms.com", yard.SITE_JAFFNA._id],
    ];

    const siteStaff = [];
    for (const [fullName, email, assignedYard] of siteStaffData) {
      siteStaff.push(
        await User.create({
          fullName,
          email,
          passwordHash: await hash("Staff12345"),
          role: "SITE_STAFF",
          assignedYard,
          managedMainYards: [],
          isActive: true,
        })
      );
    }

    console.log("Creating materials...");

    const materials = await Material.insertMany([
      { name: "Cement", code: "MAT-CEMENT", unit: "BAG", category: "Building Material", isActive: true },
      { name: "Steel Bars 10mm", code: "MAT-STEEL-10", unit: "PCS", category: "Reinforcement", isActive: true },
      { name: "Steel Bars 12mm", code: "MAT-STEEL-12", unit: "PCS", category: "Reinforcement", isActive: true },
      { name: "Steel Bars 16mm", code: "MAT-STEEL-16", unit: "PCS", category: "Reinforcement", isActive: true },
      { name: "River Sand", code: "MAT-SAND", unit: "M3", category: "Aggregate", isActive: true },
      { name: "Metal Stones 3/4", code: "MAT-METAL-34", unit: "M3", category: "Aggregate", isActive: true },
      { name: "Metal Stones 1/2", code: "MAT-METAL-12", unit: "M3", category: "Aggregate", isActive: true },
      { name: "Concrete Blocks", code: "MAT-BLOCKS", unit: "PCS", category: "Masonry", isActive: true },
      { name: "Bricks", code: "MAT-BRICKS", unit: "PCS", category: "Masonry", isActive: true },
      { name: "PVC Pipes 1 inch", code: "MAT-PVC-1", unit: "PCS", category: "Plumbing", isActive: true },
      { name: "PVC Pipes 2 inch", code: "MAT-PVC-2", unit: "PCS", category: "Plumbing", isActive: true },
      { name: "Electrical Cable 2.5mm", code: "MAT-CABLE-25", unit: "M", category: "Electrical", isActive: true },
      { name: "Electrical Cable 1.5mm", code: "MAT-CABLE-15", unit: "M", category: "Electrical", isActive: true },
      { name: "Paint White", code: "MAT-PAINT-W", unit: "L", category: "Finishing", isActive: true },
      { name: "Paint Primer", code: "MAT-PAINT-P", unit: "L", category: "Finishing", isActive: true },
      { name: "Binding Wire", code: "MAT-WIRE", unit: "KG", category: "Reinforcement", isActive: true },
      { name: "Timber Planks", code: "MAT-TIMBER", unit: "PCS", category: "Carpentry", isActive: true },
      { name: "Plywood Sheets", code: "MAT-PLYWOOD", unit: "PCS", category: "Formwork", isActive: true },
      { name: "Roofing Sheets", code: "MAT-ROOF", unit: "PCS", category: "Roofing", isActive: true },
      { name: "Tile Adhesive", code: "MAT-TILE-ADH", unit: "BAG", category: "Finishing", isActive: true },
      { name: "Floor Tiles", code: "MAT-TILES", unit: "PCS", category: "Finishing", isActive: true },
      { name: "Waterproofing Chemical", code: "MAT-WPROOF", unit: "L", category: "Chemical", isActive: true },
      { name: "Safety Helmets", code: "MAT-HELMET", unit: "PCS", category: "Safety", isActive: true },
      { name: "Safety Gloves", code: "MAT-GLOVES", unit: "PCS", category: "Safety", isActive: true },
      { name: "Nails", code: "MAT-NAILS", unit: "KG", category: "Hardware", isActive: true },
    ]);

    const mat = Object.fromEntries(materials.map((m) => [m.code, m]));

    console.log("Creating stock records...");

    const stockRows = [];
    function addStock(yardDoc, locationCode, materialDoc, qtyOnHand) {
      stockRows.push({
        yard: yardDoc._id,
        locationCode,
        material: materialDoc._id,
        qtyOnHand,
      });
    }

    const mainStock = [
      ["MAT-CEMENT", 2400], ["MAT-STEEL-10", 1500], ["MAT-STEEL-12", 1300], ["MAT-STEEL-16", 900],
      ["MAT-SAND", 420], ["MAT-METAL-34", 380], ["MAT-METAL-12", 260], ["MAT-BLOCKS", 5000],
      ["MAT-BRICKS", 8000], ["MAT-PVC-1", 450], ["MAT-PVC-2", 300], ["MAT-CABLE-25", 2500],
      ["MAT-CABLE-15", 3000], ["MAT-WIRE", 850], ["MAT-TIMBER", 350], ["MAT-PLYWOOD", 260],
      ["MAT-ROOF", 180], ["MAT-NAILS", 600], ["MAT-HELMET", 120], ["MAT-GLOVES", 300],
    ];

    for (const [code, qty] of mainStock) addStock(yard.MAIN_COLOMBO, "MAIN_STORE", mat[code], qty);
    for (const [code, qty] of mainStock.slice(0, 16)) addStock(yard.MAIN_NEGOMBO, "MAIN_STORE", mat[code], Math.floor(qty * 0.55));
    addStock(yard.MAIN_NEGOMBO, "MAIN_STORE", mat["MAT-PAINT-W"], 350);
    addStock(yard.MAIN_NEGOMBO, "MAIN_STORE", mat["MAT-PAINT-P"], 220);
    addStock(yard.MAIN_NEGOMBO, "MAIN_STORE", mat["MAT-TILE-ADH"], 180);
    addStock(yard.MAIN_NEGOMBO, "MAIN_STORE", mat["MAT-TILES"], 1600);
    addStock(yard.MAIN_NEGOMBO, "MAIN_STORE", mat["MAT-WPROOF"], 140);

    const siteStockPlan = [
      [yard.SITE_KANDY, "SITE_STORE", [["MAT-CEMENT", 320], ["MAT-STEEL-12", 180], ["MAT-SAND", 45], ["MAT-METAL-34", 38], ["MAT-WIRE", 75], ["MAT-PLYWOOD", 60], ["MAT-HELMET", 25]]],
      [yard.SITE_GALLE, "SITE_STORE", [["MAT-CEMENT", 220], ["MAT-BLOCKS", 900], ["MAT-PAINT-W", 120], ["MAT-PAINT-P", 70], ["MAT-TILE-ADH", 85], ["MAT-TILES", 550], ["MAT-WPROOF", 50]]],
      [yard.SITE_MATARA, "SITE_STORE", [["MAT-CEMENT", 280], ["MAT-STEEL-10", 210], ["MAT-STEEL-16", 90], ["MAT-SAND", 60], ["MAT-METAL-12", 44], ["MAT-BRICKS", 1200], ["MAT-NAILS", 70]]],
      [yard.SITE_KURUNEGALA, "SITE_STORE", [["MAT-CEMENT", 160], ["MAT-BLOCKS", 750], ["MAT-PVC-1", 90], ["MAT-PVC-2", 60], ["MAT-CABLE-15", 600], ["MAT-CABLE-25", 420], ["MAT-GLOVES", 50]]],
      [yard.SITE_RATMALANA, "SITE_STORE", [["MAT-CEMENT", 430], ["MAT-STEEL-12", 260], ["MAT-METAL-34", 75], ["MAT-TIMBER", 80], ["MAT-PLYWOOD", 110], ["MAT-ROOF", 90], ["MAT-HELMET", 35]]],
      [yard.SITE_JAFFNA, "SITE_STORE", [["MAT-CEMENT", 140], ["MAT-BRICKS", 1600], ["MAT-PVC-1", 75], ["MAT-CABLE-15", 450], ["MAT-PAINT-W", 80], ["MAT-TILE-ADH", 40], ["MAT-TILES", 420]]],
    ];

    for (const [yardDoc, locationCode, rows] of siteStockPlan) {
      for (const [code, qty] of rows) addStock(yardDoc, locationCode, mat[code], qty);
    }

    await Stock.insertMany(stockRows);

    console.log("Creating material creation requests...");

    const mcrPending = await MCR.create({
      mcrNo: "MCR-2026-0001",
      name: "Scaffolding Joint Pins",
      unit: "PCS",
      description: "Requested by site because additional scaffolding joint pins are required for upper floor external work.",
      requestYard: yard.SITE_KANDY._id,
      requestedBy: siteStaff[0]._id,
      status: "PENDING",
      decidedBy: null,
      decidedAt: null,
      decisionNote: "",
      createdMaterialId: null,
      history: [{ action: "CREATE", by: siteStaff[0]._id, note: "New material requested by Kandy site.", fromStatus: "", toStatus: "PENDING" }],
    });

    const mcrApproved = await MCR.create({
      mcrNo: "MCR-2026-0002",
      name: "Safety Gloves",
      unit: "PCS",
      description: "Safety gloves required as a regular safety item for construction site operations.",
      requestYard: yard.SITE_GALLE._id,
      requestedBy: siteStaff[2]._id,
      status: "APPROVED",
      decidedBy: headOfficeAdmin2._id,
      decidedAt: new Date(),
      decisionNote: "Approved because safety gloves are required across multiple sites.",
      createdMaterialId: mat["MAT-GLOVES"]._id,
      history: [
        { action: "CREATE", by: siteStaff[2]._id, note: "Requested safety gloves as a material item.", fromStatus: "", toStatus: "PENDING" },
        { action: "APPROVE", by: headOfficeAdmin2._id, note: "Approved and linked to material master record.", fromStatus: "PENDING", toStatus: "APPROVED" },
      ],
    });

    const mcrRejected = await MCR.create({
      mcrNo: "MCR-2026-0003",
      name: "Temporary Office Chairs",
      unit: "PCS",
      description: "Requested as a site office item, but not suitable for material master list.",
      requestYard: yard.SITE_RATMALANA._id,
      requestedBy: siteStaff[8]._id,
      status: "REJECTED",
      decidedBy: headOfficeAdmin1._id,
      decidedAt: new Date(),
      decisionNote: "Rejected because this item should be handled through office assets, not construction materials.",
      createdMaterialId: null,
      history: [
        { action: "CREATE", by: siteStaff[8]._id, note: "Requested temporary office chairs.", fromStatus: "", toStatus: "PENDING" },
        { action: "REJECT", by: headOfficeAdmin1._id, note: "Rejected as non-construction material.", fromStatus: "PENDING", toStatus: "REJECTED" },
      ],
    });

    const mcrPending2 = await MCR.create({
      mcrNo: "MCR-2026-0004",
      name: "Expansion Joint Filler Board",
      unit: "PCS",
      description: "Requested for slab joint work in warehouse construction.",
      requestYard: yard.SITE_RATMALANA._id,
      requestedBy: siteStaff[9]._id,
      status: "PENDING",
      decidedBy: null,
      decidedAt: null,
      decisionNote: "",
      createdMaterialId: null,
      history: [{ action: "CREATE", by: siteStaff[9]._id, note: "Requested by Ratmalana site.", fromStatus: "", toStatus: "PENDING" }],
    });

    console.log("Creating material requests...");

    const mr1 = await MR.create({
      mrNo: "MR-2026-0001",
      siteYard: yard.SITE_KANDY._id,
      toLocationCode: "SITE_STORE",
      items: [
        { material: mat["MAT-CEMENT"]._id, requestedQty: 150, approvedQty: null },
        { material: mat["MAT-STEEL-12"]._id, requestedQty: 90, approvedQty: null },
        { material: mat["MAT-SAND"]._id, requestedQty: 25, approvedQty: null },
        { material: mat["MAT-METAL-34"]._id, requestedQty: 20, approvedQty: null },
        { material: mat["MAT-WIRE"]._id, requestedQty: 40, approvedQty: null },
        { material: mat["MAT-PLYWOOD"]._id, requestedQty: 30, approvedQty: null },
      ],
      status: "PENDING",
      requestedBy: siteAdmins[0]._id,
      history: [{ action: "CREATED", by: siteAdmins[0]._id, note: "Materials requested for next slab concrete work.", at: new Date() }],
    });

    const mr2 = await MR.create({
      mrNo: "MR-2026-0002",
      siteYard: yard.SITE_GALLE._id,
      toLocationCode: "FINISH_STORE",
      items: [
        { material: mat["MAT-PAINT-W"]._id, requestedQty: 180, approvedQty: 150 },
        { material: mat["MAT-PAINT-P"]._id, requestedQty: 90, approvedQty: 80 },
        { material: mat["MAT-TILE-ADH"]._id, requestedQty: 120, approvedQty: 100 },
        { material: mat["MAT-TILES"]._id, requestedQty: 900, approvedQty: 850 },
        { material: mat["MAT-WPROOF"]._id, requestedQty: 60, approvedQty: 50 },
      ],
      status: "APPROVED",
      requestedBy: siteStaff[3]._id,
      approvedBy: headOfficeAdmin1._id,
      approvedAt: new Date(),
      history: [
        { action: "CREATED", by: siteStaff[3]._id, note: "Requested for hotel finishing stage.", at: new Date() },
        { action: "APPROVED", by: headOfficeAdmin1._id, note: "Approved with small quantity adjustments based on stock availability.", at: new Date() },
      ],
    });

    const mr3 = await MR.create({
      mrNo: "MR-2026-0003",
      siteYard: yard.SITE_MATARA._id,
      toLocationCode: "SITE_STORE",
      items: [
        { material: mat["MAT-CEMENT"]._id, requestedQty: 200, approvedQty: 180 },
        { material: mat["MAT-STEEL-10"]._id, requestedQty: 120, approvedQty: 100 },
        { material: mat["MAT-BRICKS"]._id, requestedQty: 2000, approvedQty: 1800 },
        { material: mat["MAT-SAND"]._id, requestedQty: 35, approvedQty: 30 },
        { material: mat["MAT-NAILS"]._id, requestedQty: 50, approvedQty: 45 },
        { material: mat["MAT-TIMBER"]._id, requestedQty: 50, approvedQty: 45 },
      ],
      status: "APPROVED",
      requestedBy: siteAdmins[2]._id,
      approvedBy: headOfficeAdmin2._id,
      approvedAt: new Date(),
      history: [
        { action: "CREATED", by: siteAdmins[2]._id, note: "Requested for housing scheme block work and formwork.", at: new Date() },
        { action: "APPROVED", by: headOfficeAdmin2._id, note: "Approved after reviewing current main yard stock.", at: new Date() },
      ],
    });

    const mr4 = await MR.create({
      mrNo: "MR-2026-0004",
      siteYard: yard.SITE_JAFFNA._id,
      toLocationCode: "SITE_STORE",
      items: [
        { material: mat["MAT-ROOF"]._id, requestedQty: 120, approvedQty: null },
        { material: mat["MAT-CABLE-25"]._id, requestedQty: 700, approvedQty: null },
        { material: mat["MAT-HELMET"]._id, requestedQty: 30, approvedQty: null },
      ],
      status: "REJECTED",
      requestedBy: siteStaff[11]._id,
      rejectedReason: "The requested roofing and electrical work is scheduled for a later project phase.",
      history: [
        { action: "CREATED", by: siteStaff[11]._id, note: "Requested for office complex next stage.", at: new Date() },
        { action: "REJECTED", by: headOfficeAdmin1._id, note: "Rejected because work phase has not started yet.", at: new Date() },
      ],
    });

    console.log("Creating stock movement history...");

    const movementRows = [
      { type: "RECEIVE", material: mat["MAT-CEMENT"], qty: 2400, toYard: yard.MAIN_COLOMBO, toLocationCode: "MAIN_STORE", note: "Initial cement bulk stock received.", performedBy: systemAdmin },
      { type: "RECEIVE", material: mat["MAT-STEEL-12"], qty: 1300, toYard: yard.MAIN_COLOMBO, toLocationCode: "MAIN_STORE", note: "Initial steel bar stock received.", performedBy: systemAdmin },
      { type: "RECEIVE", material: mat["MAT-BRICKS"], qty: 8000, toYard: yard.MAIN_COLOMBO, toLocationCode: "MAIN_STORE", note: "Initial brick stock received.", performedBy: systemAdmin },
      { type: "TRANSFER", material: mat["MAT-CEMENT"], qty: 320, fromYard: yard.MAIN_COLOMBO, fromLocationCode: "MAIN_STORE", toYard: yard.SITE_KANDY, toLocationCode: "SITE_STORE", note: "Opening transfer to Kandy site.", performedBy: headOfficeAdmin1 },
      { type: "TRANSFER", material: mat["MAT-BLOCKS"], qty: 900, fromYard: yard.MAIN_COLOMBO, fromLocationCode: "MAIN_STORE", toYard: yard.SITE_GALLE, toLocationCode: "SITE_STORE", note: "Opening transfer to Galle site.", performedBy: headOfficeAdmin1 },
      { type: "ISSUE", material: mat["MAT-CEMENT"], qty: 25, fromYard: yard.SITE_KANDY, fromLocationCode: "SITE_STORE", note: "Cement issued for daily concrete work.", performedBy: siteAdmins[0] },
      { type: "ISSUE", material: mat["MAT-BRICKS"], qty: 250, fromYard: yard.SITE_MATARA, fromLocationCode: "SITE_STORE", note: "Bricks issued for wall construction.", performedBy: siteAdmins[2] },
    ];

    for (const row of movementRows) {
      await StockMovement.create({
        type: row.type,
        material: row.material._id,
        qty: row.qty,
        fromYard: row.fromYard ? row.fromYard._id : null,
        fromLocationCode: row.fromLocationCode || null,
        toYard: row.toYard ? row.toYard._id : null,
        toLocationCode: row.toLocationCode || null,
        note: row.note,
        performedBy: row.performedBy._id,
        refType: "SEED",
        refId: null,
      });
    }

    const dispatchRows = [
      [mr2, "MAT-PAINT-W", 150, yard.MAIN_NEGOMBO, "MAIN_STORE", yard.SITE_GALLE, "FINISH_STORE"],
      [mr2, "MAT-PAINT-P", 80, yard.MAIN_NEGOMBO, "MAIN_STORE", yard.SITE_GALLE, "FINISH_STORE"],
      [mr2, "MAT-TILE-ADH", 100, yard.MAIN_NEGOMBO, "MAIN_STORE", yard.SITE_GALLE, "FINISH_STORE"],
      [mr3, "MAT-CEMENT", 180, yard.MAIN_COLOMBO, "MAIN_STORE", yard.SITE_MATARA, "SITE_STORE"],
      [mr3, "MAT-STEEL-10", 100, yard.MAIN_COLOMBO, "MAIN_STORE", yard.SITE_MATARA, "SITE_STORE"],
      [mr3, "MAT-BRICKS", 1800, yard.MAIN_COLOMBO, "MAIN_STORE", yard.SITE_MATARA, "SITE_STORE"],
    ];

    for (const [mr, code, qty, fromYard, fromLoc, toYard, toLoc] of dispatchRows) {
      await StockMovement.create({
        type: "MR_DISPATCH",
        material: mat[code]._id,
        qty,
        fromYard: fromYard._id,
        fromLocationCode: fromLoc,
        toYard: toYard._id,
        toLocationCode: toLoc,
        note: `Material dispatched through ${mr.mrNo}.`,
        performedBy: headOfficeAdmin1._id,
        refType: "MR",
        refId: mr._id,
      });
    }

    console.log("Creating tools...");

    const toolSeed = [
      ["Concrete Mixer", "TOOL-001", "Concrete mixer used for slab and column work.", yard.MAIN_COLOMBO, "MAIN_STORE", "AVAILABLE", null],
      ["Concrete Vibrator", "TOOL-002", "Vibrator used for concrete compaction.", yard.SITE_KANDY, "SITE_STORE", "ISSUED", "Kandy Concrete Team"],
      ["Drill Machine", "TOOL-003", "Electric drill machine for construction fixing work.", yard.SITE_GALLE, "SITE_STORE", "ISSUED", "Galle Finishing Team"],
      ["Angle Grinder", "TOOL-004", "Angle grinder for cutting steel and tiles.", yard.MAIN_NEGOMBO, "TOOL_BAY", "AVAILABLE", null],
      ["Cutting Machine", "TOOL-005", "Cutting machine used for reinforcement preparation.", yard.SITE_MATARA, "STEEL_YARD", "AVAILABLE", null],
      ["Aluminium Ladder", "TOOL-006", "Ladder sent for safety inspection.", yard.SITE_GALLE, "SITE_STORE", "MAINTENANCE", null],
      ["Wheelbarrow", "TOOL-007", "Wheelbarrow for moving materials.", yard.SITE_KANDY, "OPEN_STORE", "AVAILABLE", null],
      ["Scaffolding Set A", "TOOL-008", "Scaffolding set for external wall work.", yard.SITE_RATMALANA, "PLANT_AREA", "ISSUED", "Ratmalana Site Team"],
      ["Scaffolding Set B", "TOOL-009", "Second scaffolding set.", yard.MAIN_COLOMBO, "MAIN_STORE", "AVAILABLE", null],
      ["Water Pump", "TOOL-010", "Water pump for site dewatering.", yard.SITE_JAFFNA, "SECURE_STORE", "AVAILABLE", null],
      ["Generator 5kVA", "TOOL-011", "Portable generator for site power backup.", yard.MAIN_NEGOMBO, "TOOL_BAY", "AVAILABLE", null],
      ["Generator 10kVA", "TOOL-012", "Larger generator for project site use.", yard.SITE_RATMALANA, "PLANT_AREA", "ISSUED", "Warehouse Electrical Team"],
      ["Plate Compactor", "TOOL-013", "Compactor for ground preparation.", yard.SITE_KURUNEGALA, "MAT_SHED", "AVAILABLE", null],
      ["Welding Machine", "TOOL-014", "Welding machine for steel fabrication.", yard.SITE_MATARA, "STEEL_YARD", "ISSUED", "Matara Steel Team"],
      ["Survey Level", "TOOL-015", "Survey tool for level checks.", yard.MAIN_COLOMBO, "MAIN_STORE", "AVAILABLE", null],
      ["Laser Distance Meter", "TOOL-016", "Distance measuring tool.", yard.SITE_JAFFNA, "SECURE_STORE", "AVAILABLE", null],
      ["Tile Cutter", "TOOL-017", "Tile cutter for finishing work.", yard.SITE_GALLE, "FINISH_STORE", "AVAILABLE", null],
      ["Pipe Cutter", "TOOL-018", "Pipe cutter for plumbing work.", yard.SITE_KURUNEGALA, "SITE_STORE", "AVAILABLE", null],
      ["Safety Harness Set", "TOOL-019", "Safety harness set for height work.", yard.SITE_RATMALANA, "SITE_STORE", "AVAILABLE", null],
      ["Old Drill Machine", "TOOL-020", "Old drill machine marked as retired.", yard.MAIN_NEGOMBO, "TOOL_BAY", "RETIRED", null],
    ];

    const toolDocs = [];
    for (const [name, code, description, currentYard, currentLocationCode, status, currentHolder] of toolSeed) {
      toolDocs.push(
        await Tool.create({
          name,
          code,
          description,
          currentYard: currentYard._id,
          currentLocationCode,
          status,
          currentHolder,
          isActive: true,
        })
      );
    }

    console.log("Creating tool movement history...");

    for (const tool of toolDocs) {
      await ToolMovement.create({
        tool: tool._id,
        type: "CREATE",
        fromYard: null,
        toYard: tool.currentYard,
        fromLocationCode: null,
        toLocationCode: tool.currentLocationCode,
        issuedTo: null,
        performedBy: systemAdmin._id,
        note: "Tool created in realistic demo database.",
      });

      if (tool.status === "ISSUED") {
        await ToolMovement.create({
          tool: tool._id,
          type: "ISSUE",
          fromYard: tool.currentYard,
          toYard: tool.currentYard,
          fromLocationCode: tool.currentLocationCode,
          toLocationCode: tool.currentLocationCode,
          issuedTo: tool.currentHolder,
          performedBy: headOfficeAdmin1._id,
          note: "Tool issued to site team for current project activity.",
        });
      }

      if (tool.status === "MAINTENANCE" || tool.status === "RETIRED") {
        await ToolMovement.create({
          tool: tool._id,
          type: "STATUS_CHANGE",
          fromYard: tool.currentYard,
          toYard: tool.currentYard,
          fromLocationCode: tool.currentLocationCode,
          toLocationCode: tool.currentLocationCode,
          issuedTo: null,
          performedBy: headOfficeAdmin2._id,
          note: `Tool status changed to ${tool.status}.`,
        });
      }
    }

    console.log("Creating counters...");

    await Counter.insertMany([
      { name: "MR", seq: 4 },
      { name: "MCR", seq: 4 },
    ]);

    console.log("");
    console.log("CYMS realistic final demo data seeded successfully.");
    console.log("");
    console.log("Demo login accounts:");
    console.log("SYSTEM_ADMIN       system@cyms.com                 Admin12345");
    console.log("HEAD_OFFICE_ADMIN  headoffice@cyms.com             Head12345");
    console.log("HEAD_OFFICE_ADMIN  procurement@cyms.com            Procure12345");
    console.log("SITE_ADMIN         siteadmin.kandy@cyms.com         Site12345");
    console.log("SITE_ADMIN         siteadmin.galle@cyms.com         Site12345");
    console.log("SITE_ADMIN         siteadmin.matara@cyms.com        Site12345");
    console.log("SITE_ADMIN         siteadmin.kurunegala@cyms.com    Site12345");
    console.log("SITE_ADMIN         siteadmin.ratmalana@cyms.com     Site12345");
    console.log("SITE_ADMIN         siteadmin.jaffna@cyms.com        Site12345");
    console.log("SITE_STAFF         staff.kandy.store@cyms.com       Staff12345");
    console.log("SITE_STAFF         staff.galle.store@cyms.com       Staff12345");
    console.log("SITE_STAFF         staff.matara.store@cyms.com      Staff12345");
    console.log("SITE_STAFF         staff.jaffna.store@cyms.com      Staff12345");
    console.log("");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:");
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedDemoData();
