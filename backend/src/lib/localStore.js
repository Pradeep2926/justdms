const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const DB_PATH = process.env.LOCAL_DB_PATH
  ? path.resolve(process.env.LOCAL_DB_PATH)
  : path.join(__dirname, "../../data/local-db.json");

const INITIAL_DATA = {
  instagram_accounts: [],
  instagram_media: [],
  instagram_comments: [],
  webhook_events: [],
  automations: [],
  automation_interactions: [],
  automation_events: [],
};

function ensureDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
  }
}

function readDb() {
  ensureDb();
  return {
    ...INITIAL_DATA,
    ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")),
  };
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function matchesFilter(row, filter) {
  const value = row[filter.column];

  if (filter.op === "eq") {
    return value === filter.value;
  }

  if (filter.op === "ilike") {
    const needle = String(filter.value).replaceAll("%", "").toLowerCase();
    return String(value || "").toLowerCase().includes(needle);
  }

  return true;
}

function pickColumns(row, columns) {
  if (!columns || columns === "*") return row;

  return columns
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
    .reduce((selected, column) => {
      selected[column] = row[column];
      return selected;
    }, {});
}

class LocalQuery {
  constructor(tableName) {
    this.tableName = tableName;
    this.filters = [];
    this.selectedColumns = "*";
    this.operation = "select";
    this.payload = null;
    this.orders = [];
  }

  select(columns = "*") {
    this.selectedColumns = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }

  ilike(column, value) {
    this.filters.push({ op: "ilike", column, value });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({
      column,
      ascending: options.ascending !== false,
    });
    return this;
  }

  insert(payload) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(payload) {
    this.operation = "upsert";
    this.payload = payload;
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async single() {
    const result = await this.execute();
    const data = Array.isArray(result.data) ? result.data[0] : result.data;

    if (!data) {
      return { data: null, error: { message: "No rows found" } };
    }

    return { data, error: null };
  }

  async maybeSingle() {
    const result = await this.execute();
    const data = Array.isArray(result.data) ? result.data[0] || null : result.data;

    return { data, error: null };
  }

  async execute() {
    const db = readDb();
    const table = db[this.tableName] || [];

    if (this.operation === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const now = new Date().toISOString();
      const inserted = rows.map((row) => ({
        id: row.id || randomUUID(),
        is_active: row.is_active ?? true,
        created_at: row.created_at || now,
        updated_at: row.updated_at || now,
        ...row,
      }));

      db[this.tableName] = [...table, ...inserted];
      writeDb(db);

      return {
        data: inserted.map((row) => pickColumns(row, this.selectedColumns)),
        error: null,
      };
    }

    if (this.operation === "upsert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const now = new Date().toISOString();
      const nextTable = [...table];
      const saved = rows.map((row) => {
        const rowId = row.id || randomUUID();
        const normalized = {
          id: rowId,
          is_active: row.is_active ?? true,
          created_at: row.created_at || now,
          updated_at: row.updated_at || now,
          ...row,
        };
        const index = nextTable.findIndex((existing) => existing.id === rowId);

        if (index >= 0) {
          nextTable[index] = { ...nextTable[index], ...normalized };
        } else {
          nextTable.push(normalized);
        }

        return normalized;
      });

      db[this.tableName] = nextTable;
      writeDb(db);

      return {
        data: saved.map((row) => pickColumns(row, this.selectedColumns)),
        error: null,
      };
    }

    const matchingRows = table.filter((row) =>
      this.filters.every((filter) => matchesFilter(row, filter))
    );

    if (this.operation === "update") {
      const now = new Date().toISOString();
      const updatedRows = [];
      db[this.tableName] = table.map((row) => {
        if (!matchingRows.includes(row)) return row;
        const updated = {
          ...row,
          ...this.payload,
          updated_at: this.payload.updated_at || now,
        };
        updatedRows.push(updated);
        return updated;
      });
      writeDb(db);

      return {
        data: updatedRows.map((row) => pickColumns(row, this.selectedColumns)),
        error: null,
      };
    }

    if (this.operation === "delete") {
      db[this.tableName] = table.filter((row) => !matchingRows.includes(row));
      writeDb(db);

      return {
        data: matchingRows.map((row) => pickColumns(row, this.selectedColumns)),
        error: null,
      };
    }

    const selectedRows = [...matchingRows];

    for (const order of [...this.orders].reverse()) {
      selectedRows.sort((left, right) => {
        const leftValue = left[order.column];
        const rightValue = right[order.column];

        if (leftValue == null && rightValue == null) return 0;
        if (leftValue == null) return order.ascending ? -1 : 1;
        if (rightValue == null) return order.ascending ? 1 : -1;
        if (leftValue < rightValue) return order.ascending ? -1 : 1;
        if (leftValue > rightValue) return order.ascending ? 1 : -1;
        return 0;
      });
    }

    return {
      data: selectedRows.map((row) => pickColumns(row, this.selectedColumns)),
      error: null,
    };
  }
}

module.exports = {
  from(tableName) {
    return new LocalQuery(tableName);
  },
};
