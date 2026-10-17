# NOAA fixture

`virginia.grib2` is a public NOAA GEFS Wave ensemble-mean regional subset.

- Model run: 2026-10-17 00:00 UTC; lead: 6 hours.
- Source: https://nomads.ncep.noaa.gov/cgi-bin/filter_gefs_wave_0p25.pl
- File: `gefs.wave.t00z.mean.global.0p25.f006.grib2`.
- Directory: `/gefs.20261017/00/wave/gridded`.
- Bounds: 282–286° E, 35–39° N; all parameters and levels.
- Downloaded: 2026-10-17. The operational feed retains only a few days.
- Checked independently with ECMWF ecCodes 2.50.0 Python bindings: nearest wet point 36.75° N, 284.250012° E; combined height 0.99 m, primary period 5.20 s, primary direction 122.83°, swell heights 0.70/0.31 m, second swell period 7.07 s.

The Rust tests verify the wet-point search, values, timestamp validation, and rejection of HTML error bodies. Missing data stays null. The ensemble-mean product has no individual swell directions, so those are not inferred.

SHA-256: `78a211cc6f0ded8729c03e04adc029ce72743a9337a899b405e3958cd29cebd2`.
