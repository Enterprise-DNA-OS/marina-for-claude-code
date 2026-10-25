---
description: Shore power: record meter readings for the berths with pedestals, and see the kWh used since the last billed reading.
---

1. Record a reading: `npm run marina -- power-read <berth> <kWh on the meter> [--date]`. It refuses a reading lower than the last one (a misread or a replaced meter: check before you force anything).
2. For a round of readings the operator pastes as a list ("A03 10520, B01 22860 ..."), record each one and report the kWh used per berth.
3. Power is billed on the next invoice run at the rate in `npm run marina -- settings`, from the last billed reading to the latest.
