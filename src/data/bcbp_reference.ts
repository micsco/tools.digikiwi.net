export const BCBP_REFERENCE = {
  // Compartment Codes (Class of Service)
  // Source: IATA Standard
  compartment: {
    'F': 'First Class',
    'A': 'First Class Discounted',
    'P': 'First Class Premium',
    'J': 'Business Class',
    'C': 'Business Class',
    'D': 'Business Class Discounted',
    'I': 'Business Class Discounted',
    'Z': 'Business Class Discounted',
    'W': 'Premium Economy',
    'S': 'Economy Class',
    'Y': 'Economy Class',
    'B': 'Economy Class',
    'H': 'Economy Class',
    'K': 'Economy Class',
    'L': 'Economy Class',
    'M': 'Economy Class',
    'N': 'Economy Class',
    'Q': 'Economy Class',
    'T': 'Economy Class',
    'V': 'Economy Class',
    'X': 'Economy Class',
    'E': 'Shuttle Service',
    'U': 'Shuttle Service',
    'G': 'Shuttle Service',
    'O': 'Shuttle Service'
  } as Record<string, string>,

  // Passenger Status
  // Source: IATA Res 792
  passengerStatus: {
    '0': 'Ticketed and confirmed',
    '1': 'Ticketed and not confirmed',
    '2': 'Waitlisted',
    '3': 'Standby',
    '4': 'Boarding Pass issued',
    '5': 'Boarding Pass re-issued',
    '6': 'Original Boarding Pass',
    '7': 'Ticketed, confirmed, checked-in',
    '8': 'Ticketed, confirmed, checked-in (re-issued)'
  } as Record<string, string>,

  // Document Types (Field 16 in Conditional)
  documentType: {
    'B': 'Boarding Pass',
    'I': 'Itinerary Receipt'
  } as Record<string, string>,
};

export const AIRLINE_NAMES: Record<string, string> = {
  // Common UK Airlines
  'BA': 'British Airways',
  'U2': 'easyJet',
  'EZY': 'easyJet',
  'VS': 'Virgin Atlantic',
  'LS': 'Jet2.com',
  'FR': 'Ryanair',
  'RYR': 'Ryanair',
  'BE': 'Flybe',
  'T3': 'Eastern Airways',
  'LM': 'Loganair',

  // Common European Airlines
  'LH': 'Lufthansa',
  'AF': 'Air France',
  'KL': 'KLM Royal Dutch Airlines',
  'SK': 'SAS Scandinavian Airlines',
  'LX': 'SWISS',
  'OS': 'Austrian Airlines',
  'IB': 'Iberia',
  'AY': 'Finnair',
  'AZ': 'ITA Airways',
  'TP': 'TAP Air Portugal',
  'EI': 'Aer Lingus',
  'LO': 'LOT Polish Airlines',
  'SN': 'Brussels Airlines',
  'A3': 'Aegean Airlines',
  'VY': 'Vueling',
  'W6': 'Wizz Air',
  'DY': 'Norwegian Air Shuttle',
  'EW': 'Eurowings',
  'HV': 'Transavia',
  'TO': 'Transavia France',

  // Middle East
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  'EY': 'Etihad Airways',
  'TK': 'Turkish Airlines',
  'SV': 'Saudia',
  'RJ': 'Royal Jordanian',
  'GF': 'Gulf Air',
  'WY': 'Oman Air',
  'KU': 'Kuwait Airways',
  'ME': 'Middle East Airlines',
  'FZ': 'flydubai',

  // Major Global (US/Asia/Others for completeness)
  'AA': 'American Airlines',
  'DL': 'Delta Air Lines',
  'UA': 'United Airlines',
  'WN': 'Southwest Airlines',
  'QF': 'Qantas',
  'NZ': 'Air New Zealand',
  'SQ': 'Singapore Airlines',
  'CX': 'Cathay Pacific',
  'NH': 'All Nippon Airways (ANA)',
  'JL': 'Japan Airlines (JAL)',
  'KE': 'Korean Air',
  'CI': 'China Airlines',
  'CA': 'Air China',
  'AC': 'Air Canada',
  'JJ': 'LATAM Brasil',
  'LA': 'LATAM Airlines',
  'QZ': 'Indonesia AirAsia',
  'AK': 'AirAsia',
};

// Common Airports (Top hubs + UK/EU specific)
// This is a partial list to keep bundle size reasonable, but covers major hubs.
// We can lazy load a larger one if needed.
export const AIRPORT_NAMES: Record<string, {name: string, city: string, country: string}> = {
  // UK
  'LHR': { name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
  'LGW': { name: 'Gatwick Airport', city: 'London', country: 'United Kingdom' },
  'STN': { name: 'Stansted Airport', city: 'London', country: 'United Kingdom' },
  'LTN': { name: 'Luton Airport', city: 'London', country: 'United Kingdom' },
  'LCY': { name: 'London City Airport', city: 'London', country: 'United Kingdom' },
  'MAN': { name: 'Manchester Airport', city: 'Manchester', country: 'United Kingdom' },
  'BHX': { name: 'Birmingham Airport', city: 'Birmingham', country: 'United Kingdom' },
  'EDI': { name: 'Edinburgh Airport', city: 'Edinburgh', country: 'United Kingdom' },
  'GLA': { name: 'Glasgow Airport', city: 'Glasgow', country: 'United Kingdom' },
  'BRS': { name: 'Bristol Airport', city: 'Bristol', country: 'United Kingdom' },
  'NCL': { name: 'Newcastle International Airport', city: 'Newcastle', country: 'United Kingdom' },
  'LPL': { name: 'Liverpool John Lennon Airport', city: 'Liverpool', country: 'United Kingdom' },
  'ABZ': { name: 'Aberdeen International Airport', city: 'Aberdeen', country: 'United Kingdom' },
  'BHD': { name: 'George Best Belfast City Airport', city: 'Belfast', country: 'United Kingdom' },
  'BFS': { name: 'Belfast International Airport', city: 'Belfast', country: 'United Kingdom' },

  // Europe
  'AMS': { name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  'CDG': { name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
  'ORY': { name: 'Orly Airport', city: 'Paris', country: 'France' },
  'FRA': { name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  'MUC': { name: 'Munich Airport', city: 'Munich', country: 'Germany' },
  'MAD': { name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain' },
  'BCN': { name: 'Josep Tarradellas Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain' },
  'FCO': { name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy' },
  'ZRH': { name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' },
  'VIE': { name: 'Vienna International Airport', city: 'Vienna', country: 'Austria' },
  'CPH': { name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark' },
  'OSL': { name: 'Oslo Airport', city: 'Oslo', country: 'Norway' },
  'ARN': { name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden' },
  'HEL': { name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland' },
  'DUB': { name: 'Dublin Airport', city: 'Dublin', country: 'Ireland' },
  'LIS': { name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'Portugal' },
  'IST': { name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
  'ATH': { name: 'Athens International Airport', city: 'Athens', country: 'Greece' },
  'WAW': { name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland' },
  'BUD': { name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary' },
  'PRG': { name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czech Republic' },
  'BRU': { name: 'Brussels Airport', city: 'Brussels', country: 'Belgium' },

  // Middle East
  'DXB': { name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
  'AUH': { name: 'Zayed International Airport', city: 'Abu Dhabi', country: 'UAE' },
  'DOH': { name: 'Hamad International Airport', city: 'Doha', country: 'Qatar' },
  'RUH': { name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
  'JED': { name: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
  'AMM': { name: 'Queen Alia International Airport', city: 'Amman', country: 'Jordan' },
  'MCT': { name: 'Muscat International Airport', city: 'Muscat', country: 'Oman' },

  // US Major
  'JFK': { name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
  'LGA': { name: 'LaGuardia Airport', city: 'New York', country: 'USA' },
  'EWR': { name: 'Newark Liberty International Airport', city: 'Newark', country: 'USA' },
  'LAX': { name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
  'SFO': { name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA' },
  'ORD': { name: "O'Hare International Airport", city: 'Chicago', country: 'USA' },
  'ATL': { name: 'Hartsfield–Jackson Atlanta International Airport', city: 'Atlanta', country: 'USA' },
  'DFW': { name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'USA' },
  'MIA': { name: 'Miami International Airport', city: 'Miami', country: 'USA' },

  // Asia Major
  'SIN': { name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
  'HKG': { name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
  'HND': { name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
  'NRT': { name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
  'ICN': { name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
  'BKK': { name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
  'SYD': { name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
};
