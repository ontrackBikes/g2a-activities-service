const { Location } = require("../models");

const {
  createLocationSchema,
  updateLocationSchema,
} = require("../schemas/location.schema");

const createLocation = async (req, res) => {
  try {
    const { error, value } =
      createLocationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    if (value.parent_location_id) {
      const parentLocation =
        await Location.findByPk(
          value.parent_location_id
        );

      if (!parentLocation) {
        return res.status(404).json({
          success: false,
          message: "Parent location not found",
        });
      }
    }

    const location = await Location.create(
      value
    );

    return res.status(201).json({
      success: true,
      message:
        "Location created successfully",
      data: location,
    });
  } catch (error) {
    console.error(
      "[LocationController] createLocation",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocations = async (req, res) => {
  try {
    const {
      active,
      location_type,
      parent_location_id,
    } = req.query;

    const where = {};

    if (active !== undefined) {
      where.active = active === "true";
    }

    if (location_type) {
      where.location_type =
        location_type;
    }

    if (parent_location_id) {
      where.parent_location_id =
        parent_location_id;
    }

    const locations =
      await Location.findAll({
        where,
        order: [["name", "ASC"]],
      });

    return res.json({
      success: true,
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    console.error(
      "[LocationController] getLocations",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocation = async (req, res) => {
  try {
    const location =
      await Location.findByPk(
        req.params.id,
        {
          include: [
            {
              model: Location,
              as: "parent",
            },
            {
              model: Location,
              as: "children",
            },
          ],
        }
      );

    if (!location) {
      return res.status(404).json({
        success: false,
        message:
          "Location not found",
      });
    }

    return res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error(
      "[LocationController] getLocation",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocationOptions = async (
  req,
  res
) => {
  try {
    const locations =
      await Location.findAll({
        where: {
          active: true,
        },
        attributes: [
          "id",
          "name",
          "slug",
        ],
        order: [["name", "ASC"]],
      });

    const options = locations.map(
      (location) => ({
        id: location.id,
        label: location.name,
        slug: location.slug,
      })
    );

    return res.json({
      success: true,
      count: options.length,
      data: options,
    });
  } catch (error) {
    console.error(
      "[LocationController] getLocationOptions",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocationTree = async (
  req,
  res
) => {
  try {
    const locations =
      await Location.findAll({
        where: {
          active: true,
        },
        raw: true,
      });

    const map = {};
    const roots = [];

    locations.forEach((location) => {
      map[location.id] = {
        ...location,
        children: [],
      };
    });

    locations.forEach((location) => {
      if (
        location.parent_location_id
      ) {
        const parent =
          map[
            location.parent_location_id
          ];

        if (parent) {
          parent.children.push(
            map[location.id]
          );
        }
      } else {
        roots.push(
          map[location.id]
        );
      }
    });

    return res.json({
      success: true,
      data: roots,
    });
  } catch (error) {
    console.error(
      "[LocationController] getLocationTree",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateLocation = async (
  req,
  res
) => {
  try {
    const { error, value } =
      updateLocationSchema.validate(
        req.body
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const location =
      await Location.findByPk(
        req.params.id
      );

    if (!location) {
      return res.status(404).json({
        success: false,
        message:
          "Location not found",
      });
    }

    if (
      value.parent_location_id
    ) {
      const parentLocation =
        await Location.findByPk(
          value.parent_location_id
        );

      if (!parentLocation) {
        return res.status(404).json({
          success: false,
          message:
            "Parent location not found",
        });
      }

      if (
        Number(
          value.parent_location_id
        ) === Number(req.params.id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Location cannot be its own parent",
        });
      }
    }

    await location.update(value);

    return res.json({
      success: true,
      message:
        "Location updated successfully",
      data: location,
    });
  } catch (error) {
    console.error(
      "[LocationController] updateLocation",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteLocation = async (
  req,
  res
) => {
  try {
    const location =
      await Location.findByPk(
        req.params.id
      );

    if (!location) {
      return res.status(404).json({
        success: false,
        message:
          "Location not found",
      });
    }

    await location.update({
      active: false,
    });

    return res.json({
      success: true,
      message:
        "Location deleted successfully",
    });
  } catch (error) {
    console.error(
      "[LocationController] deleteLocation",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createLocation,
  getLocations,
  getLocation,
  getLocationOptions,
  getLocationTree,
  updateLocation,
  deleteLocation,
};