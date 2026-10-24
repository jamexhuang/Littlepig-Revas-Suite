export const APP_VERSION = "v2.8.1 - 修復最便宜供應商計算邏輯 (Fixed cheapest supplier calculation logic)";

export const SERVICE_RECIPES = {
    "Domestic horse riding": [
        { keyword: "Accommodation - horse riding camp", category: "Accommodation", rule: { type: 'per_person', val: 13, desc: "13 nights/p" } },
        { keyword: "Daily meals - horse riding camp", category: "Meals", rule: { type: 'per_person', val: 14, desc: "14 days/p" } },
        { keyword: "Domestic insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Bus - horse riding camp", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Camp counsellor - horse riding camp", category: "Staff", rule: { type: 'per_group', val: 15, desc: "1 per 15 pax" } },
        { keyword: "Horse riding camp manager", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Horse riding instructor", category: "Staff", rule: { type: 'per_group', val: 15, desc: "1 per 15 pax" } }
    ],
    "Domestic language": [
        { keyword: "Accommodation - language camp", category: "Accommodation", rule: { type: 'per_person', val: 13, desc: "13 nights/p" } },
        { keyword: "Daily meals - language camps", category: "Meals", rule: { type: 'per_person', val: 14, desc: "14 days/p" } },
        { keyword: "Domestic insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Bus - language camp", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Camp counsellor - language camp", category: "Staff", rule: { type: 'per_group', val: 15, desc: "1 per 15 pax" } },
        { keyword: "Language camp manager", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Language teacher", category: "Staff", rule: { type: 'per_group', val: 15, desc: "1 per 15 pax" } }
    ],
    "Domestic trip to beach": [
        { keyword: "Accommodation - trip to the beach", category: "Accommodation", rule: { type: 'per_person', val: 9, desc: "9 nights/p" } },
        { keyword: "Daily meals - trip to the beach", category: "Meals", rule: { type: 'per_person', val: 10, desc: "10 days/p" } },
        { keyword: "Domestic insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Bus - trip to the beach", category: "Transport", rule: { type: 'per_group', val: 50, desc: "1 per 50 pax" } },
        { keyword: "Entrance tickets - trip to the beach", category: "Tickets", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Tourist group leader - trip to the beach", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Tourist guide - trip to the beach", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } }
    ],
    "Family holidays": [
        { keyword: "Accommodation - Family holidays", category: "Accommodation", rule: { type: 'per_person', val: 6, desc: "6 nights/p" } },
        { keyword: "Daily meals - Family holidays", category: "Meals", rule: { type: 'per_person', val: 7, desc: "7 days/p" } },
        { keyword: "International insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Plane seat - Family holidays (round trip)", category: "Transport", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Shuttle bus from the airport to the hotel and back - Family holidays", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Holiday representative - Family holidays", category: "Staff", rule: { type: 'per_group', val: 80, desc: "1 per 80 pax" } }
    ],
    "Active holidays": [
        { keyword: "Accommodation - Active holidays", category: "Accommodation", rule: { type: 'per_person', val: 6, desc: "6 nights/p" } },
        { keyword: "Daily meals - Active holidays", category: "Meals", rule: { type: 'per_person', val: 7, desc: "7 days/p" } },
        { keyword: "International insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Plane seat - Active holidays (round trip)", category: "Transport", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Shuttle bus from the airport to the hotel and back - Active holidays", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Holiday representative - Active holidays", category: "Staff", rule: { type: 'per_group', val: 80, desc: "1 per 80 pax" } }
    ],
    "Seaside holidays": [
        { keyword: "Accommodation - Seaside holidays", category: "Accommodation", rule: { type: 'per_person', val: 6, desc: "6 nights/p" } },
        { keyword: "Daily meals - Seaside holidays", category: "Meals", rule: { type: 'per_person', val: 7, desc: "7 days/p" } },
        { keyword: "International insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Plane seat - Seaside holidays (round trip)", category: "Transport", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Shuttle bus from the airport to the hotel and back - Seaside holidays", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Holiday representative - Seaside holidays", category: "Staff", rule: { type: 'per_group', val: 80, desc: "1 per 80 pax" } }
    ],
    "Wellness holidays": [
        { keyword: "Accommodation - Wellness holidays", category: "Accommodation", rule: { type: 'per_person', val: 6, desc: "6 nights/p" } },
        { keyword: "Daily meals - Wellness holidays", category: "Meals", rule: { type: 'per_person', val: 7, desc: "7 days/p" } },
        { keyword: "International insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Plane seat - Wellness holidays (round trip)", category: "Transport", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Shuttle bus from the airport to the hotel and back - Wellness holidays", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Holiday representative - Wellness holidays", category: "Staff", rule: { type: 'per_group', val: 80, desc: "1 per 80 pax" } }
    ],
    "Foreign capital city": [
        { keyword: "Accommodation - trip to a foreign capital city", category: "Accommodation", rule: { type: 'per_person', val: 9, desc: "9 nights/p" } },
        { keyword: "Daily meals - trip to a foreign capital city", category: "Meals", rule: { type: 'per_person', val: 10, desc: "10 days/p" } },
        { keyword: "International insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Bus - trip to a foreign capital city", category: "Transport", rule: { type: 'per_group', val: 60, desc: "1 per 60 pax" } },
        { keyword: "Entrance tickets - trip to a foreign capital city", category: "Tickets", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Tourist group leader - trip to a foreign capital city", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Tourist guide - trip to a foreign capital city", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } }
    ],
    "Adventure holidays": [
        { keyword: "Accommodation - Adventure holidays", category: "Accommodation", rule: { type: 'per_person', val: 6, desc: "6 nights/p" } },
        { keyword: "Daily meals - Adventure holidays", category: "Meals", rule: { type: 'per_person', val: 7, desc: "7 days/p" } },
        { keyword: "International insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Plane seat - Adventure holidays (round trip)", category: "Transport", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Shuttle bus from the airport to the hotel and back - Adventure holidays", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Holiday representative - Adventure holidays", category: "Staff", rule: { type: 'per_group', val: 80, desc: "1 per 80 pax" } }
    ],
    "Wildlife holidays": [
        { keyword: "Accommodation - Wildlife holidays", category: "Accommodation", rule: { type: 'per_person', val: 6, desc: "6 nights/p" } },
        { keyword: "Daily meals - Wildlife holidays", category: "Meals", rule: { type: 'per_person', val: 7, desc: "7 days/p" } },
        { keyword: "International insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Plane seat - Wildlife holidays (round trip)", category: "Transport", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Shuttle bus from the airport to the hotel and back - Wildlife holidays", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Holiday representative - Wildlife holidays", category: "Staff", rule: { type: 'per_group', val: 80, desc: "1 per 80 pax" } }
    ],
    "Domestic skiing": [
        { keyword: "Accommodation - skiing camp", category: "Accommodation", rule: { type: 'per_person', val: 6, desc: "6 nights/p" } },
        { keyword: "Daily meals - skiing camp", category: "Meals", rule: { type: 'per_person', val: 7, desc: "7 days/p" } },
        { keyword: "Domestic insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Bus - skiing camp", category: "Transport", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Skiing camp manager", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Ski instructor", category: "Staff", rule: { type: 'per_group', val: 15, desc: "1 per 15 pax" } }
    ],
    "Domestic mountain": [
        { keyword: "Accommodation - mountain trip", category: "Accommodation", rule: { type: 'per_person', val: 9, desc: "9 nights/p" } },
        { keyword: "Daily meals - mountain trip", category: "Meals", rule: { type: 'per_person', val: 10, desc: "10 days/p" } },
        { keyword: "Domestic insurance", category: "Insurance", rule: { type: 'per_person', val: 1, desc: "1 per person" } },
        { keyword: "Bus - mountain trip", category: "Transport", rule: { type: 'per_group', val: 50, desc: "1 per 50 pax" } },
        { keyword: "Tourist group leader - mountain trip", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } },
        { keyword: "Tourist guide - mountain trip", category: "Staff", rule: { type: 'per_group', val: 40, desc: "1 per 40 pax" } }
    ]
};

export const SERVICE_CATEGORIES = {
    "Adventure holidays": "International",
    "Family holidays": "International",
    "Wildlife holidays": "International",
    "Active holidays": "International",
    "Seaside holidays": "International",
    "Wellness holidays": "International",
    "Foreign capital city": "International",
    "Domestic horse riding": "Domestic",
    "Domestic language": "Domestic",
    "Domestic skiing": "Domestic",
    "Domestic mountain": "Domestic",
    "Domestic trip to beach": "Domestic"
};

export const SERVICE_TIMES = {
    "Adventure holidays": 2,
    "Family holidays": 2,
    "Wildlife holidays": 2.5,
    "Active holidays": 2,
    "Seaside holidays": 2,
    "Wellness holidays": 2,
    "Foreign capital city": 2.5,
    "Domestic horse riding": 1,
    "Domestic language": 1,
    "Domestic skiing": 0.6,
    "Domestic mountain": 1.2,
    "Domestic trip to beach": 1.2
};

export const SUGGESTED_PRICES = {
    "Adventure holidays": 1199,
    "Family holidays": 999,
    "Wildlife holidays": 799,
    "Active holidays": 649,
    "Seaside holidays": 1299,
    "Wellness holidays": 624,
    "Foreign capital city": 999,
    "Domestic horse riding": 1349,
    "Domestic language": 1299,
    "Domestic skiing": 719,
    "Domestic mountain": 649,
    "Domestic trip to beach": 749
};

export const DEFAULT_ANALYZER_DATA = Object.keys(SERVICE_RECIPES).map(name => ({
    name,
    defaultParticipants: 20,
    resources: SERVICE_RECIPES[name],
    realCost: 0
}));

export const DEMAND_DATA = {
    "Adventure holidays": { annualDemand: 305, expectedPrice: 1199, seasonality: [0.6, 0.7, 0.8, 0.9, 1, 1.3, 1.5, 1.6, 1.1, 1, 0.9, 0.6] },
    "Family holidays": { annualDemand: 380, expectedPrice: 999, seasonality: [0.8, 0.8, 0.8, 0.9, 1, 1.1, 1.3, 1.4, 1.2, 1, 0.9, 0.8] },
    "Wildlife holidays": { annualDemand: 360, expectedPrice: 799, seasonality: [0.9, 0.7, 0.8, 0.9, 1, 1.3, 1.4, 1.3, 1.2, 1.1, 0.8, 0.6] },
    "Active holidays": { annualDemand: 390, expectedPrice: 649, seasonality: [0.5, 0.5, 0.7, 0.7, 1.2, 1.4, 1.5, 1.8, 1.2, 1.1, 0.8, 0.6] },
    "Seaside holidays": { annualDemand: 300, expectedPrice: 1299, seasonality: [0.6, 0.5, 0.7, 0.7, 1.1, 1.6, 1.8, 1.7, 1.3, 0.9, 0.5, 0.7] },
    "Wellness holidays": { annualDemand: 340, expectedPrice: 624, seasonality: [0.4, 0.4, 0.6, 0.7, 1.5, 1.8, 1.8, 1.5, 1.4, 1, 0.7, 0.2] },
    "Foreign capital city": { annualDemand: 500, expectedPrice: 999, seasonality: [0.8, 0.9, 0.9, 1, 1.1, 1.2, 0.9, 1.1, 1.2, 1.1, 0.9, 0.9] },
    "Domestic horse riding": { annualDemand: 180, expectedPrice: 1349, seasonality: [0.8, 0.9, 0.9, 1.1, 1.1, 1.2, 1.2, 1.2, 1, 0.9, 0.9, 0.8] },
    "Domestic language": { annualDemand: 370, expectedPrice: 1299, seasonality: [1, 1, 1, 0.9, 1, 1.1, 1.2, 1.2, 1.1, 0.8, 0.8, 0.9] },
    "Domestic skiing": { annualDemand: 300, expectedPrice: 719, seasonality: [2.6, 1.9, 1.4, 0.6, 0.3, 0, 0, 0, 0.9, 1.8, 2.5] },
    "Domestic mountain": { annualDemand: 270, expectedPrice: 649, seasonality: [1.3, 1.3, 0.7, 0.9, 1, 1.1, 1.1, 1.1, 0.7, 0.7, 0.8, 1.3] },
    "Domestic trip to beach": { annualDemand: 440, expectedPrice: 749, seasonality: [0.7, 0.8, 0.9, 0.9, 1, 1.1, 1.3, 1.4, 1.2, 1, 0.9, 0.8] }
};
