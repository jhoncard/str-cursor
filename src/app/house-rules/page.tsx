import type { Metadata } from "next";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "House Rules",
  description:
    "General house rules for all Feathers Houses rental properties in Tampa Bay.",
};

export default function HouseRulesPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#2b2b36] mb-2">
            House Rules
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            These rules apply to all Feathers Houses properties. Individual listings may have
            additional requirements.
          </p>

          <div className="prose prose-gray max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#2b2b36] [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-gray-600 [&_ul]:mb-4 [&_li]:mb-1">
            <h2>Check-In and Check-Out</h2>
            <p>
              Check-in is available from the time listed on your booking confirmation, typically
              starting at 4:00 PM. Check-out must be completed by the listed time, typically
              11:00 AM. All properties use self check-in via smart lock. Your unique access
              code will be provided before arrival.
            </p>

            <h2>Maximum Occupancy</h2>
            <p>
              The number of guests staying at the property must not exceed the maximum
              occupancy listed on the booking. Unregistered guests are not permitted to stay
              overnight. If you need to update your guest count, please contact us before
              arrival.
            </p>

            <h2>Noise and Quiet Hours</h2>
            <p>
              Our properties are located in residential neighborhoods. Please be respectful
              of neighbors and keep noise to a minimum, especially during quiet hours from
              10:00 PM to 8:00 AM. Outdoor music, loud gatherings, and other disruptive
              activities are not permitted during these hours.
            </p>

            <h2>No Smoking</h2>
            <p>
              Smoking of any kind — including cigarettes, e-cigarettes, vapes, and cigars — is
              strictly prohibited inside all properties. Smoking is only permitted in
              designated outdoor areas where ashtrays are provided. A cleaning fee of up to
              $250 may be charged if evidence of indoor smoking is found.
            </p>

            <h2>No Parties or Events</h2>
            <p>
              Parties, events, and large gatherings are not permitted at any Feathers Houses
              property unless explicitly approved in writing before your stay. This includes
              bachelor/bachelorette parties, birthday parties, and any gathering that exceeds
              the listed occupancy.
            </p>

            <h2>Pets</h2>
            <p>
              Some of our properties welcome pets. If a listing is marked as pet-friendly,
              you may bring pets with prior notice. A pet fee may apply to cover additional
              cleaning. Pets must be supervised at all times, must not be left alone in the
              property for extended periods, and must not be allowed on beds or furniture.
              Guests are responsible for cleaning up after their pets in all indoor and
              outdoor areas.
            </p>

            <h2>Kitchen and Cooking</h2>
            <p>
              Guests are welcome to use the kitchen and all provided cooking equipment.
              Please clean dishes, cookware, and countertops after use. Do not leave food
              out overnight. Take care when using the stove and oven, and ensure all
              appliances are turned off after use.
            </p>

            <h2>Trash and Recycling</h2>
            <p>
              Please dispose of trash in the designated bins. For stays longer than a few
              days, move full trash bags to the outdoor bins. Recycling guidelines vary by
              property and are posted in the kitchen area. Do not leave trash bags outside
              the bins, as this may attract wildlife.
            </p>

            <h2>Pool and Hot Tub</h2>
            <p>
              Where available, pools and hot tubs are for use at your own risk. Children must
              be supervised by an adult at all times in and around the pool area. Glass
              containers are not permitted in the pool area. Please shower before entering
              the hot tub. Pool hours are from 8:00 AM to 10:00 PM.
            </p>

            <h2>Property Care</h2>
            <p>
              Please treat the property as you would your own home. Report any damage or
              maintenance issues promptly so we can address them quickly. Do not move
              furniture between rooms or rearrange major fixtures. Guests may be held
              financially responsible for damage beyond normal wear and tear.
            </p>

            <h2>Parking</h2>
            <p>
              Free parking is available at all properties. Please park only in designated
              areas as described in your arrival guide. Do not block driveways, sidewalks,
              or neighboring properties. The number of parking spots varies by property.
            </p>

            <h2>Departure</h2>
            <p>
              Before checking out, we kindly ask that you:
            </p>
            <ul className="list-disc pl-6">
              <li>Turn off all lights, fans, and the thermostat</li>
              <li>Lock all doors and windows</li>
              <li>Place used towels in the bathtub or designated hamper</li>
              <li>Run the dishwasher if it is full</li>
              <li>Take all personal belongings with you</li>
              <li>Dispose of perishable food items</li>
            </ul>
            <p>
              Full cleaning is handled by our team after checkout. These simple steps help
              us prepare the property for the next guest efficiently.
            </p>

            <h2>Questions</h2>
            <p>
              If you have questions about any of these rules or need clarification during your
              stay, please reach out to us at{" "}
              <a href="mailto:info@feathershouses.com" className="text-[#2b2b36] underline">
                info@feathershouses.com
              </a>{" "}
              or call (813) 555-0100. We are happy to help.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
