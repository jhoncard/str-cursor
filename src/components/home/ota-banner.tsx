export function OtaBanner() {
  return (
    <div className="mt-8 md:mt-12 w-full bg-[#2b2b36] rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center gap-8 shadow-xl">
      <p className="text-white/80 text-sm md:text-base font-medium text-center">
        We advertise your accommodation on the most competitive online platforms
      </p>
      
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale contrast-200 brightness-200 mix-blend-screen">
        <span className="text-white font-bold text-xl flex items-center gap-1"><span className="border border-white p-0.5 rounded-sm text-xs">H</span> Hoteis.com</span>
        <span className="text-white font-bold text-2xl tracking-tighter">flatio</span>
        <span className="text-white font-bold text-xl flex items-center gap-1">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 6l5 10H7l5-10z"/></svg> 
          Expedia
        </span>
        <span className="text-white font-serif italic font-bold text-3xl">Vrbo</span>
        <span className="text-white font-bold text-xl">Booking.com</span>
        <span className="text-white font-bold text-xl flex items-center gap-1">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12S6.2 22.5 12 22.5 22.5 17.8 22.5 12 17.8 1.5 12 1.5zM12 18.5c-3.6 0-6.5-2.9-6.5-6.5S8.4 5.5 12 5.5s6.5 2.9 6.5 6.5-2.9 6.5-6.5 6.5zm-1.8-8.8c.4-.4 1.1-.4 1.5 0l3.8 3.8c.4.4.4 1.1 0 1.5-.4.4-1.1.4-1.5 0l-3-3-1.5 1.5c-.4.4-1.1.4-1.5 0-.4-.4-.4-1.1 0-1.5l2.2-2.3z"/></svg>
            airbnb
        </span>
      </div>
    </div>
  );
}
