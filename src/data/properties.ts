export type PropertyType = 'room' | 'guest_suite' | 'guesthouse' | 'entire_home';

export interface Property {
  id: string;
  slug: string;
  airbnbUrl: string;
  name: string;
  propertyType: PropertyType;
  shortDescription: string;
  hostName: string;
  isSuperhost: boolean;
  rating: number;
  reviewCount: number;
  locationCity: string;
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePriceNight: number;
  cleaningFee: number;
  serviceFee: number;
  checkInFrom: string;
  checkOutBy: string;
  cancellationPolicy: string;
  amenities: string[];
  houseRules: string[];
  images: string[];
}

export const propertiesData: Property[] = [
  {
    id: "prop-1",
    slug: "cozy-room-tampa",
    airbnbUrl: "https://www.airbnb.com/h/tampacoziness",
    name: "Private entrance and private bath Cozy room Tampa",
    propertyType: "room",
    shortDescription: "A cozy and private room located in the heart of Tampa, perfect for a solo traveler or couple.",
    hostName: "Jhon",
    isSuperhost: true,
    rating: 4.87,
    reviewCount: 131,
    locationCity: "Tampa",
    locationAddress: "Central Tampa, FL",
    locationLat: 27.9506,
    locationLng: -82.4572,
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    basePriceNight: 85,
    cleaningFee: 45,
    serviceFee: 28,
    checkInFrom: "4:00 PM",
    checkOutBy: "11:00 AM",
    cancellationPolicy: "Add your trip dates to get the cancellation details for this stay.",
    amenities: ["Fast WiFi (276 Mbps)", "Dedicated workspace", "Kitchen", "Free parking on premises", "Lock on bedroom door", "Self check-in", "Pets allowed", "Backyard", "Hair dryer"],
    houseRules: ["2 guests maximum", "Check-in after 4:00 PM", "Checkout before 11:00 AM", "Shared side-yard entrance"],
    images: [
      "https://images.unsplash.com/photo-1522771731478-4ea583a5aa98?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=800&auto=format&fit=crop"
    ]
  },
  {
    id: "prop-2",
    slug: "room-paradise-tampa",
    airbnbUrl: "https://www.airbnb.com/h/tamparoomparadaise",
    name: "Tampa cozy private room paradise",
    propertyType: "guest_suite",
    shortDescription: "A luxurious guest suite with a private kitchen and beautiful modern decor.",
    hostName: "Daniel",
    isSuperhost: true,
    rating: 4.83,
    reviewCount: 42,
    locationCity: "Tampa",
    locationAddress: "South Tampa, FL",
    locationLat: 27.9150,
    locationLng: -82.5050,
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    basePriceNight: 120,
    cleaningFee: 60,
    serviceFee: 35,
    checkInFrom: "4:00 PM",
    checkOutBy: "11:00 AM",
    cancellationPolicy: "Add your trip dates to get the cancellation details for this stay.",
    amenities: ["Kitchen", "Wifi", "Dedicated workspace", "Free parking on premises", "Lock on bedroom door", "Self check-in", "Pets allowed", "Air conditioning", "Backyard", "Hair dryer"],
    houseRules: ["2 guests maximum", "Check-in after 4:00 PM", "Checkout before 11:00 AM", "Private room with separate side entrance"],
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop"
    ]
  },
  {
    id: "prop-3",
    slug: "small-house-tampa",
    airbnbUrl: "https://www.airbnb.com/h/smallhousetampa",
    name: "Private small house in Tampa",
    propertyType: "guesthouse",
    shortDescription: "An entirely independent guesthouse offering full privacy, ideal for short or long stays.",
    hostName: "Nadia",
    isSuperhost: false,
    rating: 4.88,
    reviewCount: 64,
    locationCity: "Tampa",
    locationAddress: "North Tampa, FL",
    locationLat: 28.0333,
    locationLng: -82.4269,
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    basePriceNight: 150,
    cleaningFee: 75,
    serviceFee: 42,
    checkInFrom: "3:00 PM",
    checkOutBy: "10:00 AM",
    cancellationPolicy: "Add your trip dates to get the cancellation details for this stay.",
    amenities: ["Kitchen", "Wifi", "Dedicated workspace", "Free parking on premises", "Self check-in", "Pets allowed", "Air conditioning", "Hair dryer", "Refrigerator", "Microwave"],
    houseRules: ["2 guests maximum", "Check-in after 4:00 PM", "Checkout before 11:00 AM", "Pet fee applies", "No smoking inside"],
    images: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502672260266-1c1c2cb1ac89?q=80&w=800&auto=format&fit=crop"
    ]
  },
  {
    id: "prop-4",
    slug: "st-pete-oasis",
    airbnbUrl: "https://www.airbnb.com/h/poolplaystpete",
    name: "St Pete Oasis:Heated Pool, Hot Tub, Pet-Friendly",
    propertyType: "entire_home",
    shortDescription: "A stunning 4-bedroom oasis featuring a private pool, perfect for large groups and family vacations.",
    hostName: "Kelly",
    isSuperhost: true,
    rating: 4.87,
    reviewCount: 15,
    locationCity: "St. Petersburg",
    locationAddress: "Downtown St. Petersburg, FL",
    locationLat: 27.7731,
    locationLng: -82.6400,
    maxGuests: 12,
    bedrooms: 4,
    beds: 7,
    bathrooms: 2,
    basePriceNight: 450,
    cleaningFee: 180,
    serviceFee: 95,
    checkInFrom: "4:00 PM",
    checkOutBy: "10:00 AM",
    cancellationPolicy: "Add your trip dates to get the cancellation details for this stay.",
    amenities: ["Kitchen", "Wifi", "Dedicated workspace", "Free parking on premises", "Pool", "Hot tub", "Pets allowed", "Washer", "Dryer"],
    houseRules: ["12 guests maximum", "Check-in after 4:00 PM", "Checkout before 10:00 AM", "Pool heat fee applies", "No parties or events"],
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop"
    ]
  }
];
