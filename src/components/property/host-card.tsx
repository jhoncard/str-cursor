import { Shield, Clock, MessageCircle, Star } from "lucide-react";

interface HostCardProps {
  hostName: string;
  isSuperhost: boolean;
}

export function HostCard({ hostName, isSuperhost }: HostCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#2b2b36] text-white flex items-center justify-center text-xl font-bold">
          {hostName.charAt(0)}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#2b2b36]">Hosted by {hostName}</h3>
          {isSuperhost && (
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="w-4 h-4 text-[#2b2b36]" />
              <span className="text-sm font-medium text-[#2b2b36]">Superhost</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Star className="w-4 h-4 text-[#2b2b36]" />
          <span>186 reviews</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Shield className="w-4 h-4 text-[#2b2b36]" />
          <span>Identity verified</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4 text-[#2b2b36]" />
          <span>Responds within an hour</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MessageCircle className="w-4 h-4 text-[#2b2b36]" />
          <span>98% response rate</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-6">
        {hostName} has been hosting for over 3 years and takes pride in making every
        guest feel welcome. As a local, {hostName} is happy to share tips on the best
        restaurants, attractions, and hidden gems nearby.
      </p>

      <button
        type="button"
        className="w-full py-3 rounded-full border-2 border-[#2b2b36] text-[#2b2b36] font-medium hover:bg-[#2b2b36] hover:text-white transition-colors"
      >
        Contact Host
      </button>
    </div>
  );
}
