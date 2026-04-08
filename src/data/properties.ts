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
    locationAddress: "1705 Windsor Way, Tampa, FL 33619",
    locationLat: 27.936512,
    locationLng: -82.363742,
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
      "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/3db32537-3c90-4ab3-8f76-c64b3a1a5b8f.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/3212e089-7304-4a52-98d7-53b72ce91566.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/f1102b35-b5cd-4163-a875-dd1848bf2397.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/84efab22-148d-47d9-a996-1f0492591b63.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/064558eb-4185-4549-b433-1c8da8a58707.jpeg"
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
    locationAddress: "1705 Windsor Way, Tampa, FL 33619",
    locationLat: 27.936512,
    locationLng: -82.363742,
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
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/42134967-bdfd-4edc-af42-45c8b53afdeb.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/1271dd5a-ccba-46ab-9735-e9a70a6704b8.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f16b9a45-298c-451c-849b-127e9b8166f1.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/660047be-2519-4d28-8d3c-ce99496b77b7.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f87f5c9b-cf75-4a1a-a1d8-d3cfd1929bbf.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/9f4121bf-24f9-4157-b0b5-7c1bd6fe2c8d.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/842c9d5f-f3d2-4567-a7d7-9d0adcac2435.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/210a7cd6-8e70-472f-be1a-2cc9c11731db.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/50897723-e21e-40c7-9f39-b14822a23977.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f41ee471-c208-4684-9a4c-ab4de8db0089.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/4fc9d56c-345c-4a7f-8fc9-81bf8b4dfd83.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f7f6829e-9ca1-41d0-b657-6cd0aeec0a97.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/3318cc7b-59ef-43ef-a0e5-136ac9ec8da9.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/6a998c35-ea0c-4848-818f-c06cd40372c9.jpeg"
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
    locationAddress: "1705 Windsor Way, Tampa, FL 33619",
    locationLat: 27.936512,
    locationLng: -82.363742,
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
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/23ebb471-87fa-42e4-b0d8-f4f822af5063.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/510160ff-252d-4c7b-9473-ad0bf4f0981e.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/4469d74b-2858-4251-a940-a72b05941fa4.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/478af77a-abf4-425c-8a45-1804a24a7e41.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/8b6df791-d34e-4ed6-be8d-0be4eab6c914.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/6805854f-3062-49a9-9066-8d1f1a4289eb.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/eba0221d-17ae-4af2-b9ca-83b4575972ee.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/82dbacc0-2af0-46bc-9a12-279f9e29a1c0.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/e9e252a1-1aab-4117-a94d-5778adad36aa.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/100d506f-40ac-48c0-b7be-a281748fcb3b.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/6517a240-b09a-4b28-b375-eb1df010c47c.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/565d2683-0cb7-4e4f-92b8-55a071cbc820.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/8b5eb0eb-9ee9-4363-8c4c-09ead66e17b4.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/47f601fe-0de5-4599-8eb9-856e23ab336a.jpeg"
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
    locationAddress: "11040 54th Ave N, St. Petersburg, FL 33708",
    locationLat: 27.821497,
    locationLng: -82.792626,
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
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/4e1c1577-4b1e-4daa-be24-5a8dcac67524.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/6818848d-067d-4a68-bdce-83af2010a239.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7234682c-6e85-462e-bc40-120eff456058.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/11cfc399-17b7-4867-a6b6-2ba9b23487a0.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/c6080e3d-d678-489b-a16f-beeb2214dd83.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/480e5c8c-d371-47b3-a970-a0c990ae5546.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7c343d98-4b45-44eb-87de-86277bfdef12.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/5aad1a7a-b4fa-42e0-878c-bf1b03ef61d3.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/c5f2e949-e1e2-4f95-831f-bbf0f527d30f.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/2fec1952-326a-44d6-b051-952d0556c6f7.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/8bfb0248-f817-4e64-9e1e-26b65b3d92c3.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/4dd9e8eb-9e4f-44d8-92c4-5a5e30d5046f.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/5bd4da46-a5ea-430e-9d94-7e151754dc63.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7e6545f4-3b60-4d8f-9e6b-fb4a8794537e.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1b228779-0fe6-43e4-b1b9-63b102ebe2c9.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/66fd93db-60c0-4b47-a7d1-7db3dc8994c7.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/544a0683-81c1-4917-8dd1-b216f1d288d6.jpeg",
      "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1303247562314270220/original/f672c828-3f02-4cb4-a90a-c1fdf36b1f9d.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/fa980036-ee13-4705-b49b-ecba22f74f2f.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/713bd0c4-21d2-4068-aeea-243d12b77421.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/c88f2cb3-557b-450b-a6c4-25c3c3dfd9f6.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/91e4f6ac-55a3-4d06-a1c5-0f73afd1804b.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/5b911563-2459-41b3-9999-45175eef55ea.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/47fb50e8-4cc2-4cd4-b858-2f207953a13a.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/23798d06-6096-4893-8c93-c9ebccabfaa3.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/a7a2c3d4-ea34-4864-ba9c-096a5aeda3c4.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/2466a4da-2e53-406e-b13d-4dc206561c76.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1f2e061b-57a3-435f-a800-ee39da531797.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/96ffc43e-7b7a-4a7d-a239-7d3395914383.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1d498961-e148-47ae-9add-8c37a3c89aa5.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/b28a1af4-2910-4423-aff2-6cb82f253e42.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/bc9d0aa7-47c0-40f3-8ee2-835d9e1f0580.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1a6a6073-499a-402b-b49b-a200c067e3d8.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7aafcb2f-f6ce-43a5-b89e-f64c957e9130.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/59724c5c-bc54-4688-a80f-2cd166902ab2.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/9b9ac06f-6183-484c-8fb8-2fe9b2a04462.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/4700ba1f-9007-46e9-a1d6-7b714792e5c3.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/fcb340eb-e887-43a0-9273-5ff4c1aa3d9a.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/8336a77e-918d-4fe4-98d1-4bbddb7da9d9.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/19481f0e-1d5c-4b38-9449-90f74d09688e.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/69e791fb-036c-4209-b246-4782b6b98474.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/6861e761-aa32-4cb8-a943-119f3544c4d3.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/a13cb6c3-fcd1-4add-ae06-437ba9dffca6.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/a899a5dd-0a55-443e-b9f4-ed47b6699f3f.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/003b8881-c27d-43da-975a-dbf5b01f5eee.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/8e323d7c-ccdc-4b32-83e6-79983d49a17b.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/e7b1bb3e-d518-4654-bfa8-e290a006320f.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/e78ce066-a388-414e-946a-4b68e6dbdcc6.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/151e1aaf-856d-4924-b8d9-139e7ae1a143.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/6f96cf0f-2339-4b3f-8665-f3a06fafb00f.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/b1c0bec0-b714-4130-8121-d7d43a392051.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/30430e2f-8f14-4fd0-bedc-28d3e30c3346.jpeg"
    ]
  }
];
