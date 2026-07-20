// Geographic seed catalog — countries of the supported jurisdictions, their
// states/provinces, and major cities (India carries the deepest city list; a
// tenant admin can add missing cities from the UI at any time).
//
// Format: [stateCode, stateName, type?] and cities keyed by state code.

type StateTuple = [code: string, name: string, type?: string];

export interface GeoCountrySeed {
  code: string;
  name: string;
  states: StateTuple[];
  cities: Record<string, string[]>; // state code → major cities
}

export const GEO_CATALOG: GeoCountrySeed[] = [
  {
    code: 'IN',
    name: 'India',
    states: [
      ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'],
      ['BR', 'Bihar'], ['CG', 'Chhattisgarh'], ['GA', 'Goa'], ['GJ', 'Gujarat'],
      ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JH', 'Jharkhand'],
      ['KA', 'Karnataka'], ['KL', 'Kerala'], ['MP', 'Madhya Pradesh'],
      ['MH', 'Maharashtra'], ['MN', 'Manipur'], ['ML', 'Meghalaya'],
      ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OD', 'Odisha'], ['PB', 'Punjab'],
      ['RJ', 'Rajasthan'], ['SK', 'Sikkim'], ['TN', 'Tamil Nadu'],
      ['TS', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'],
      ['UK', 'Uttarakhand'], ['WB', 'West Bengal'],
      ['AN', 'Andaman and Nicobar Islands', 'UNION_TERRITORY'],
      ['CH', 'Chandigarh', 'UNION_TERRITORY'],
      ['DN', 'Dadra and Nagar Haveli and Daman and Diu', 'UNION_TERRITORY'],
      ['DL', 'Delhi', 'UNION_TERRITORY'],
      ['JK', 'Jammu and Kashmir', 'UNION_TERRITORY'],
      ['LA', 'Ladakh', 'UNION_TERRITORY'],
      ['LD', 'Lakshadweep', 'UNION_TERRITORY'],
      ['PY', 'Puducherry', 'UNION_TERRITORY'],
    ],
    cities: {
      AP: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore'],
      AS: ['Guwahati', 'Silchar', 'Dibrugarh'],
      BR: ['Patna', 'Gaya', 'Muzaffarpur'],
      CG: ['Raipur', 'Bhilai', 'Bilaspur'],
      GA: ['Panaji', 'Margao', 'Vasco da Gama'],
      GJ: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
      HR: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
      HP: ['Shimla', 'Dharamshala', 'Mandi'],
      JH: ['Ranchi', 'Jamshedpur', 'Dhanbad'],
      KA: ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi'],
      KL: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
      MP: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
      MH: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Navi Mumbai'],
      MN: ['Imphal'], ML: ['Shillong'], MZ: ['Aizawl'], NL: ['Kohima', 'Dimapur'],
      OD: ['Bhubaneswar', 'Cuttack', 'Rourkela'],
      PB: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Mohali'],
      RJ: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
      SK: ['Gangtok'],
      TN: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
      TS: ['Hyderabad', 'Warangal', 'Nizamabad'],
      TR: ['Agartala'],
      UP: ['Lucknow', 'Noida', 'Kanpur', 'Varanasi', 'Agra', 'Ghaziabad', 'Prayagraj'],
      UK: ['Dehradun', 'Haridwar', 'Haldwani'],
      WB: ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
      AN: ['Port Blair'], CH: ['Chandigarh'], DN: ['Daman', 'Silvassa'],
      DL: ['New Delhi', 'Delhi'], JK: ['Srinagar', 'Jammu'], LA: ['Leh'],
      LD: ['Kavaratti'], PY: ['Puducherry'],
    },
  },
  {
    code: 'US',
    name: 'United States',
    states: [
      ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
      ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'],
      ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
      ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
      ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
      ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
      ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
      ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
      ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
      ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
      ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
      ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
      ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
      ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
      ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
      ['DC', 'District of Columbia', 'DISTRICT'],
    ],
    cities: {
      CA: ['San Francisco', 'Los Angeles', 'San Diego', 'San Jose', 'Sacramento'],
      NY: ['New York City', 'Buffalo', 'Albany'],
      TX: ['Austin', 'Dallas', 'Houston', 'San Antonio'],
      WA: ['Seattle', 'Bellevue', 'Spokane'],
      IL: ['Chicago'], MA: ['Boston'], GA: ['Atlanta'], CO: ['Denver'],
      NC: ['Charlotte', 'Raleigh'], FL: ['Miami', 'Orlando', 'Tampa'],
      NJ: ['Jersey City', 'Newark'], VA: ['Arlington', 'Richmond'],
      PA: ['Philadelphia', 'Pittsburgh'], AZ: ['Phoenix'], OR: ['Portland'],
      MN: ['Minneapolis'], DC: ['Washington'],
    },
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    states: [
      ['ENG', 'England', 'NATION'], ['SCT', 'Scotland', 'NATION'],
      ['WLS', 'Wales', 'NATION'], ['NIR', 'Northern Ireland', 'NATION'],
    ],
    cities: {
      ENG: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Cambridge', 'Oxford'],
      SCT: ['Edinburgh', 'Glasgow', 'Aberdeen'],
      WLS: ['Cardiff', 'Swansea'],
      NIR: ['Belfast'],
    },
  },
  {
    code: 'CA',
    name: 'Canada',
    states: [
      ['AB', 'Alberta', 'PROVINCE'], ['BC', 'British Columbia', 'PROVINCE'],
      ['MB', 'Manitoba', 'PROVINCE'], ['NB', 'New Brunswick', 'PROVINCE'],
      ['NL', 'Newfoundland and Labrador', 'PROVINCE'],
      ['NS', 'Nova Scotia', 'PROVINCE'], ['ON', 'Ontario', 'PROVINCE'],
      ['PE', 'Prince Edward Island', 'PROVINCE'], ['QC', 'Quebec', 'PROVINCE'],
      ['SK', 'Saskatchewan', 'PROVINCE'],
      ['NT', 'Northwest Territories', 'TERRITORY'], ['NU', 'Nunavut', 'TERRITORY'],
      ['YT', 'Yukon', 'TERRITORY'],
    ],
    cities: {
      ON: ['Toronto', 'Ottawa', 'Mississauga', 'Waterloo'],
      BC: ['Vancouver', 'Victoria'], QC: ['Montreal', 'Quebec City'],
      AB: ['Calgary', 'Edmonton'], MB: ['Winnipeg'], NS: ['Halifax'],
      SK: ['Saskatoon', 'Regina'],
    },
  },
  {
    code: 'AU',
    name: 'Australia',
    states: [
      ['NSW', 'New South Wales'], ['VIC', 'Victoria'], ['QLD', 'Queensland'],
      ['WA', 'Western Australia'], ['SA', 'South Australia'], ['TAS', 'Tasmania'],
      ['ACT', 'Australian Capital Territory', 'TERRITORY'],
      ['NT', 'Northern Territory', 'TERRITORY'],
    ],
    cities: {
      NSW: ['Sydney', 'Newcastle', 'Wollongong'], VIC: ['Melbourne', 'Geelong'],
      QLD: ['Brisbane', 'Gold Coast', 'Cairns'], WA: ['Perth'],
      SA: ['Adelaide'], TAS: ['Hobart'], ACT: ['Canberra'], NT: ['Darwin'],
    },
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    states: [
      ['AUK', 'Auckland', 'REGION'], ['WGN', 'Wellington', 'REGION'],
      ['CAN', 'Canterbury', 'REGION'], ['WKO', 'Waikato', 'REGION'],
      ['BOP', 'Bay of Plenty', 'REGION'], ['OTA', 'Otago', 'REGION'],
      ['MWT', 'Manawatū-Whanganui', 'REGION'], ['HKB', "Hawke's Bay", 'REGION'],
    ],
    cities: {
      AUK: ['Auckland'], WGN: ['Wellington'], CAN: ['Christchurch'],
      WKO: ['Hamilton'], BOP: ['Tauranga'], OTA: ['Dunedin', 'Queenstown'],
      MWT: ['Palmerston North'], HKB: ['Napier'],
    },
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    states: [
      ['AZ', 'Abu Dhabi', 'EMIRATE'], ['DU', 'Dubai', 'EMIRATE'],
      ['SH', 'Sharjah', 'EMIRATE'], ['AJ', 'Ajman', 'EMIRATE'],
      ['UQ', 'Umm Al Quwain', 'EMIRATE'], ['RK', 'Ras Al Khaimah', 'EMIRATE'],
      ['FU', 'Fujairah', 'EMIRATE'],
    ],
    cities: {
      AZ: ['Abu Dhabi', 'Al Ain'], DU: ['Dubai'], SH: ['Sharjah'],
      AJ: ['Ajman'], UQ: ['Umm Al Quwain'], RK: ['Ras Al Khaimah'], FU: ['Fujairah'],
    },
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    states: [
      ['01', 'Riyadh', 'PROVINCE'], ['02', 'Makkah', 'PROVINCE'],
      ['03', 'Madinah', 'PROVINCE'], ['04', 'Eastern Province', 'PROVINCE'],
      ['05', 'Al-Qassim', 'PROVINCE'], ['06', "Ha'il", 'PROVINCE'],
      ['07', 'Tabuk', 'PROVINCE'], ['08', 'Northern Borders', 'PROVINCE'],
      ['09', 'Jazan', 'PROVINCE'], ['10', 'Najran', 'PROVINCE'],
      ['11', 'Al-Bahah', 'PROVINCE'], ['12', 'Al-Jawf', 'PROVINCE'],
      ['13', 'Asir', 'PROVINCE'],
    ],
    cities: {
      '01': ['Riyadh'], '02': ['Jeddah', 'Mecca', 'Taif'], '03': ['Medina'],
      '04': ['Dammam', 'Al Khobar', 'Dhahran'], '13': ['Abha'],
    },
  },
  {
    code: 'QA',
    name: 'Qatar',
    states: [
      ['DA', 'Ad Dawhah', 'MUNICIPALITY'], ['RA', 'Al Rayyan', 'MUNICIPALITY'],
      ['WA', 'Al Wakrah', 'MUNICIPALITY'], ['KH', 'Al Khor', 'MUNICIPALITY'],
      ['US', 'Umm Salal', 'MUNICIPALITY'],
    ],
    cities: {
      DA: ['Doha'], RA: ['Al Rayyan'], WA: ['Al Wakrah'], KH: ['Al Khor'],
      US: ['Umm Salal'],
    },
  },
  {
    code: 'BH',
    name: 'Bahrain',
    states: [
      ['13', 'Capital', 'GOVERNORATE'], ['14', 'Southern', 'GOVERNORATE'],
      ['15', 'Muharraq', 'GOVERNORATE'], ['16', 'Northern', 'GOVERNORATE'],
    ],
    cities: { '13': ['Manama'], '15': ['Muharraq'], '14': ['Riffa'], '16': ['Hamad Town'] },
  },
  {
    code: 'KW',
    name: 'Kuwait',
    states: [
      ['KU', 'Al Asimah', 'GOVERNORATE'], ['HA', 'Hawalli', 'GOVERNORATE'],
      ['FA', 'Al Farwaniyah', 'GOVERNORATE'], ['AH', 'Al Ahmadi', 'GOVERNORATE'],
      ['JA', 'Al Jahra', 'GOVERNORATE'], ['MU', 'Mubarak Al-Kabeer', 'GOVERNORATE'],
    ],
    cities: {
      KU: ['Kuwait City'], HA: ['Hawalli', 'Salmiya'], FA: ['Al Farwaniyah'],
      AH: ['Al Ahmadi', 'Fahaheel'], JA: ['Al Jahra'],
    },
  },
  {
    code: 'OM',
    name: 'Oman',
    states: [
      ['MA', 'Muscat', 'GOVERNORATE'], ['BS', 'Al Batinah South', 'GOVERNORATE'],
      ['BN', 'Al Batinah North', 'GOVERNORATE'], ['DA', 'Ad Dakhiliyah', 'GOVERNORATE'],
      ['SS', 'Ash Sharqiyah South', 'GOVERNORATE'], ['ZU', 'Dhofar', 'GOVERNORATE'],
    ],
    cities: {
      MA: ['Muscat', 'Seeb'], BN: ['Sohar'], ZU: ['Salalah'], DA: ['Nizwa'],
    },
  },
];
