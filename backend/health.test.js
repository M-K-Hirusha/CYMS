const request = require("supertest");
const app = require("./src/app");

describe("Health API", () => {
  test("TC-001: should return backend health status", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.environment).toBe("test");
    expect(res.body.timestamp).toBeDefined();
  });
});

describe("Protected Routes", () => {
  test("TC-002: should block users API without token", async () => {
    const res = await request(app).get("/api/users");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Authentication API", () => {
  test("TC-003: should reject login with missing email and password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});

    expect([400, 401]).toContain(res.statusCode);
    expect(res.body.message).toBeDefined();
  });
});

describe("Invalid Route Handling", () => {
  test("TC-004: should return 404 for unknown API route", async () => {
    const res = await request(app).get("/api/unknown-route");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Route not found");
    expect(res.body.path).toBe("/api/unknown-route");
  });
});

describe("Root API", () => {
  test("TC-005: should return CYMS API running message", async () => {
    const res = await request(app).get("/");

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("CYMS API is running");
  });
});

describe("Material Routes Security", () => {
  test("TC-006: should block materials API without token", async () => {
    const res = await request(app).get("/api/materials");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Yard Routes Security", () => {
  test("TC-007: should block yards API without token", async () => {
    const res = await request(app).get("/api/yards");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Inventory Routes Security", () => {
  test("TC-008: should block inventory API without token", async () => {
    const res = await request(app).get("/api/inventory");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Material Request Routes Security", () => {
  test("TC-009: should block material request API without token", async () => {
    const res = await request(app).get("/api/mrs");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Tool Routes Security", () => {
  test("TC-010: should block tools API without token", async () => {
    const res = await request(app).get("/api/tools");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Report Routes Security", () => {
  test("TC-011: should block reports summary API without token", async () => {
    const res = await request(app).get("/api/reports/summary");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Additional Protected Routes Security", () => {
  const protectedRoutes = [
    {
      id: "TC-012",
      name: "should block MCR API without token",
      method: "get",
      path: "/api/mcrs",
    },
    {
      id: "TC-013",
      name: "should block inventory receive API without token",
      method: "post",
      path: "/api/inventory/receive",
    },
    {
      id: "TC-014",
      name: "should block inventory issue API without token",
      method: "post",
      path: "/api/inventory/issue",
    },
    {
      id: "TC-015",
      name: "should block inventory transfer API without token",
      method: "post",
      path: "/api/inventory/transfer",
    },
    {
      id: "TC-016",
      name: "should block tool movements API without token",
      method: "get",
      path: "/api/tools/movements",
    },
  ];

  test.each(protectedRoutes)("$id: $name", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});

describe("Invalid Request Validation", () => {
  const invalidPostRoutes = [
    {
      id: "TC-017",
      name: "should reject user creation with empty body",
      path: "/api/users",
    },
    {
      id: "TC-018",
      name: "should reject material creation with empty body",
      path: "/api/materials",
    },
    {
      id: "TC-019",
      name: "should reject yard creation with empty body",
      path: "/api/yards",
    },
    {
      id: "TC-020",
      name: "should reject MCR creation with empty body",
      path: "/api/mcrs",
    },
    {
      id: "TC-021",
      name: "should reject MR creation with empty body",
      path: "/api/mrs",
    },
    {
      id: "TC-022",
      name: "should reject tool creation with empty body",
      path: "/api/tools",
    },
  ];

  test.each(invalidPostRoutes)("$id: $name", async ({ path }) => {
    const res = await request(app).post(path).send({});

    expect([400, 401, 403]).toContain(res.statusCode);
    expect(res.body.message).toBeDefined();
  });
});

describe("HTTP Method Validation", () => {
  const wrongMethodRoutes = [
    {
      id: "TC-023",
      name: "should not allow POST request to health endpoint",
      method: "post",
      path: "/api/health",
    },
    {
      id: "TC-024",
      name: "should not allow PUT request to health endpoint",
      method: "put",
      path: "/api/health",
    },
    {
      id: "TC-025",
      name: "should not allow DELETE request to health endpoint",
      method: "delete",
      path: "/api/health",
    },
    {
      id: "TC-026",
      name: "should not allow POST request to root endpoint",
      method: "post",
      path: "/",
    },
  ];

  test.each(wrongMethodRoutes)("$id: $name", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect([404, 405]).toContain(res.statusCode);
    expect(res.body.message || res.text).toBeDefined();
  });
});

describe("Additional API Security and Error Handling Tests", () => {
  const additionalApiTests = [
    {
      id: "TC-027",
      name: "should reject unauthenticated request to users by id",
      method: "get",
      path: "/api/users/000000000000000000000000",
    },
    {
      id: "TC-028",
      name: "should reject unauthenticated update user request",
      method: "put",
      path: "/api/users/000000000000000000000000",
    },
    {
      id: "TC-029",
      name: "should reject unauthenticated delete/deactivate user request",
      method: "delete",
      path: "/api/users/000000000000000000000000",
    },
    {
      id: "TC-030",
      name: "should reject unauthenticated material by id request",
      method: "get",
      path: "/api/materials/000000000000000000000000",
    },
    {
      id: "TC-031",
      name: "should reject unauthenticated material update request",
      method: "put",
      path: "/api/materials/000000000000000000000000",
    },
    {
      id: "TC-032",
      name: "should reject unauthenticated material delete request",
      method: "delete",
      path: "/api/materials/000000000000000000000000",
    },
    {
      id: "TC-033",
      name: "should reject unauthenticated yard by id request",
      method: "get",
      path: "/api/yards/000000000000000000000000",
    },
    {
      id: "TC-034",
      name: "should reject unauthenticated yard update request",
      method: "put",
      path: "/api/yards/000000000000000000000000",
    },
    {
      id: "TC-035",
      name: "should reject unauthenticated yard status update request",
      method: "patch",
      path: "/api/yards/000000000000000000000000/status",
    },
    {
      id: "TC-036",
      name: "should reject unauthenticated inventory stock summary request",
      method: "get",
      path: "/api/inventory/stock",
    },
    {
      id: "TC-037",
      name: "should reject unauthenticated inventory movements request",
      method: "get",
      path: "/api/inventory/movements",
    },
    {
      id: "TC-038",
      name: "should reject unauthenticated inventory adjustment request",
      method: "post",
      path: "/api/inventory/adjust",
    },
    {
      id: "TC-039",
      name: "should reject unauthenticated MCR by id request",
      method: "get",
      path: "/api/mcrs/000000000000000000000000",
    },
    {
      id: "TC-040",
      name: "should reject unauthenticated MCR approval request",
      method: "post",
      path: "/api/mcrs/000000000000000000000000/approve",
    },
    {
      id: "TC-041",
      name: "should reject unauthenticated MCR rejection request",
      method: "post",
      path: "/api/mcrs/000000000000000000000000/reject",
    },
    {
      id: "TC-042",
      name: "should reject unauthenticated MR by id request",
      method: "get",
      path: "/api/mrs/000000000000000000000000",
    },
    {
      id: "TC-043",
      name: "should reject unauthenticated MR approval request",
      method: "post",
      path: "/api/mrs/000000000000000000000000/approve",
    },
    {
      id: "TC-044",
      name: "should reject unauthenticated MR rejection request",
      method: "post",
      path: "/api/mrs/000000000000000000000000/reject",
    },
    {
      id: "TC-045",
      name: "should reject unauthenticated tool by id request",
      method: "get",
      path: "/api/tools/000000000000000000000000",
    },
    {
      id: "TC-046",
      name: "should reject unauthenticated tool issue request",
      method: "post",
      path: "/api/tools/000000000000000000000000/issue",
    },
    {
      id: "TC-047",
      name: "should reject unauthenticated tool return request",
      method: "post",
      path: "/api/tools/000000000000000000000000/return",
    },
    {
      id: "TC-048",
      name: "should reject unauthenticated tool transfer request",
      method: "post",
      path: "/api/tools/000000000000000000000000/transfer",
    },
    {
      id: "TC-049",
      name: "should reject unauthenticated tool status update request",
      method: "patch",
      path: "/api/tools/000000000000000000000000/status",
    },
    {
      id: "TC-050",
      name: "should reject unknown nested API route",
      method: "get",
      path: "/api/reports/unknown-report-route",
    },
  ];

  test.each(additionalApiTests)("$id: $name", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect([400, 401, 403, 404, 405]).toContain(res.statusCode);
    expect(res.body.message || res.text).toBeDefined();
  });
});