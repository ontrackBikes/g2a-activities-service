module.exports = async (
  jobName,
  handler
) => {
  const start = Date.now();

  try {
    console.info(
      `[CRON] ${jobName} started`
    );

    const result = await handler();

    console.info(
      `[CRON] ${jobName} completed in ${
        Date.now() - start
      }ms`
    );

    return result;
  } catch (error) {
    console.error(
      `[CRON] ${jobName} failed`,
      error
    );

    throw error;
  }
};