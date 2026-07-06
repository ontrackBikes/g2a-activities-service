const { QueryTypes } = require("sequelize");
const moment = require("moment-timezone");

const sequelize = require("../config/sequelize");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const normalizeIds = (values = []) => [
  ...new Set(
    values
      .filter((value) => value !== undefined && value !== null)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0),
  ),
];

const normalizeSlugs = (values = []) => [
  ...new Set(
    values
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean),
  ),
];

const formatNextAvailableSlot = (row) =>
  row.schedule_date;

const getNextAvailableSlotsForProducts = async ({
  productIds,
  locationIds = [],
  locationSlugs = [],
  guests = 1,
  groupByLocation = false,
}) => {
  const normalizedProductIds = normalizeIds(productIds);

  if (!normalizedProductIds.length) {
    return new Map();
  }

  const normalizedLocationIds = normalizeIds(locationIds);
  const normalizedLocationSlugs =
    normalizeSlugs(locationSlugs);
  const requestedGuests = Math.max(
    Number.parseInt(guests, 10) || 1,
    1,
  );
  const now = moment().tz(APP_TIMEZONE);
  const today = now.format("YYYY-MM-DD");
  const currentTime = now.format("HH:mm:ss");

  const replacements = {
    productIds: normalizedProductIds,
    today,
    currentTime,
    guests: requestedGuests,
  };

  if (normalizedLocationIds.length) {
    replacements.locationIds = normalizedLocationIds;
  }

  if (normalizedLocationSlugs.length) {
    replacements.locationSlugs = normalizedLocationSlugs;
  }

  const buildConditions = ({
    vendorProductAlias,
    locationAlias,
    scheduleAlias,
    slotAlias,
  }) => {
    const conditions = [
      `${vendorProductAlias}.product_id IN (:productIds)`,
      `${vendorProductAlias}.active = 1`,
      `${locationAlias}.active = 1`,
      `${scheduleAlias}.status = 'OPEN'`,
      `${scheduleAlias}.schedule_date >= :today`,
      `${slotAlias}.status = 'OPEN'`,
      `${slotAlias}.available >= :guests`,
      `${slotAlias}.max_bookable_per_booking >= :guests`,
      `(
        ${scheduleAlias}.schedule_date > :today
        OR ${slotAlias}.start_time IS NULL
        OR ${slotAlias}.start_time > :currentTime
      )`,
    ];

    if (normalizedLocationIds.length) {
      conditions.push(
        `${vendorProductAlias}.location_id IN (:locationIds)`,
      );
    }

    if (normalizedLocationSlugs.length) {
      conditions.push(
        `${locationAlias}.slug IN (:locationSlugs)`,
      );
    }

    return conditions;
  };

  const conditions = buildConditions({
    vendorProductAlias: "vp",
    locationAlias: "l",
    scheduleAlias: "vs",
    slotAlias: "vss",
  });
  const candidateConditions = buildConditions({
    vendorProductAlias: "candidate_vp",
    locationAlias: "candidate_l",
    scheduleAlias: "candidate_vs",
    slotAlias: "candidate_vss",
  });
  const candidateLocationSelect = groupByLocation
    ? "candidate_vp.location_id,"
    : "";
  const candidateLocationGroup = groupByLocation
    ? ", candidate_vp.location_id"
    : "";
  const candidateLocationJoin = groupByLocation
    ? "AND next_schedule.location_id = vp.location_id"
    : "";

  const rows = await sequelize.query(
    `
      SELECT
        vp.product_id,
        vp.location_id,
        vp.pricing_type,
        l.name AS location_name,
        l.slug AS location_slug,
        vs.schedule_date,
        vss.slot_name,
        vss.start_time,
        vss.end_time,
        vss.price,
        vss.available
      FROM vendor_products AS vp
      INNER JOIN locations AS l
        ON l.id = vp.location_id
      INNER JOIN vendor_schedules AS vs
        ON vs.vendor_product_id = vp.id
      INNER JOIN vendor_schedule_slots AS vss
        ON vss.vendor_schedule_id = vs.id
      INNER JOIN (
        SELECT
          candidate_vp.product_id,
          ${candidateLocationSelect}
          MIN(candidate_vs.schedule_date) AS schedule_date
        FROM vendor_products AS candidate_vp
        INNER JOIN locations AS candidate_l
          ON candidate_l.id = candidate_vp.location_id
        INNER JOIN vendor_schedules AS candidate_vs
          ON candidate_vs.vendor_product_id = candidate_vp.id
        INNER JOIN vendor_schedule_slots AS candidate_vss
          ON candidate_vss.vendor_schedule_id = candidate_vs.id
        WHERE ${candidateConditions.join("\n          AND ")}
        GROUP BY
          candidate_vp.product_id
          ${candidateLocationGroup}
      ) AS next_schedule
        ON next_schedule.product_id = vp.product_id
        ${candidateLocationJoin}
        AND next_schedule.schedule_date = vs.schedule_date
      WHERE ${conditions.join("\n        AND ")}
      ORDER BY
        vp.product_id ASC,
        vs.schedule_date ASC,
        CASE
          WHEN vss.start_time IS NULL THEN 0
          ELSE 1
        END ASC,
        vss.start_time ASC,
        vss.price ASC,
        vp.id ASC,
        vss.id ASC
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    },
  );

  const results = new Map();

  for (const row of rows) {
    const productId = Number(row.product_id);
    const resultKey = groupByLocation
      ? `${productId}:${Number(row.location_id)}`
      : productId;

    if (!results.has(resultKey)) {
      results.set(
        resultKey,
        formatNextAvailableSlot(row),
      );
    }
  }

  return results;
};

const getNextAvailableSlotsForProductLocations = async ({
  productIds,
  locationIds = [],
  locationSlugs = [],
  guests = 1,
}) =>
  getNextAvailableSlotsForProducts({
    productIds,
    locationIds,
    locationSlugs,
    guests,
    groupByLocation: true,
  });

const getNextAvailableSlotForProduct = async ({
  productId,
  locationId,
  locationIds = [],
  locationSlug,
  locationSlugs = [],
  guests = 1,
}) => {
  const results =
    await getNextAvailableSlotsForProducts({
      productIds: [productId],
      locationIds: [
        locationId,
        ...locationIds,
      ],
      locationSlugs: [
        locationSlug,
        ...locationSlugs,
      ],
      guests,
    });

  return results.get(Number(productId)) || null;
};

module.exports = {
  getNextAvailableSlotForProduct,
  getNextAvailableSlotsForProducts,
  getNextAvailableSlotsForProductLocations,
};
