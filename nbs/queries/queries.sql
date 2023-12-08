
# Return swell_data in correct order to reshape pixels
SELECT
    COALESCE(swell, 0) as swell,
    latitude,
    longitude
FROM wave_forecast
WHERE
    valid_time = '2023-12-08 00:00:00+00'
ORDER BY
    latitude DESC,
    longitude ASC;


SELECT * FROM wave_forecast WHERE entry_updated >= '2023-12-08 10:00';


-- DELETE FROM wave_forecast
-- WHERE
--     entry_updated >= '2023-12-08 10:00';