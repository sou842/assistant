"use client";

import React from "react";
import { 
  Cloud, 
  CloudDrizzle, 
  CloudFog, 
  CloudLightning, 
  CloudRain, 
  CloudSnow, 
  CloudSun, 
  Sun, 
  Thermometer, 
  Wind, 
  Droplets,
  Navigation
} from "lucide-react";

interface WeatherData {
  location: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  units: {
    temperature: string;
    windspeed: string;
  };
}

const getWeatherIcon = (code: number, size: number = 24) => {
  if (code === 0) return <Sun size={size} className="text-yellow-400" />;
  if (code >= 1 && code <= 3) return <CloudSun size={size} className="text-gray-300" />;
  if (code === 45 || code === 48) return <CloudFog size={size} className="text-gray-400" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className="text-blue-300" />;
  if (code >= 61 && code <= 65) return <CloudRain size={size} className="text-blue-400" />;
  if (code >= 71 && code <= 75) return <CloudSnow size={size} className="text-blue-100" />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className="text-blue-500" />;
  if (code >= 95) return <CloudLightning size={size} className="text-purple-400" />;
  return <Cloud size={size} className="text-gray-400" />;
};

const getWeatherDescription = (code: number) => {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 75) return "Snow Fall";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
};

export function WeatherCard({ data }: { data: WeatherData }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return (
    <div className="my-6 w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#070707] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="relative p-6">
        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition">
          {getWeatherIcon(data.current.weathercode, 80)}
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/40 mb-1">
            <Navigation size={12} className="rotate-45" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{data.location}</span>
          </div>
          
          <div className="flex items-baseline gap-1">
            <h1 className="text-6xl font-light tracking-tighter text-white">
              {Math.round(data.current.temperature)}
            </h1>
            <span className="text-2xl font-light text-white/30">{data.units.temperature}</span>
          </div>
          
          <p className="mt-2 text-sm font-medium text-white/70">
            {getWeatherDescription(data.current.weathercode)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px bg-white/5 border-y border-white/5">
        <div className="bg-[#070707] p-4 flex items-center gap-3">
          <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
            <Wind size={14} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/25">Wind Speed</p>
            <p className="text-xs font-medium text-white/80">{data.current.windspeed} {data.units.windspeed}</p>
          </div>
        </div>
        <div className="bg-[#070707] p-4 flex items-center gap-3">
          <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
            <Thermometer size={14} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/25">Max Temp</p>
            <p className="text-xs font-medium text-white/80">{Math.round(data.daily.temperature_2m_max[0])}°</p>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-4">7-Day Forecast</p>
        <div className="space-y-4">
          {data.daily.time.slice(1, 6).map((time, i) => {
            const date = new Date(time);
            const dayName = days[date.getDay()];
            const index = i + 1; // offset by 1 because we skipped today
            
            return (
              <div key={time} className="flex items-center justify-between group/day">
                <span className="text-xs font-medium text-white/40 w-10 group-hover/day:text-white/60 transition">
                  {dayName}
                </span>
                <div className="flex items-center gap-3 flex-1 px-4">
                  <div className="size-1 w-full bg-white/5 rounded-full overflow-hidden relative h-1">
                    <div 
                      className="absolute inset-y-0 bg-gradient-to-r from-blue-500/40 to-indigo-500/40 rounded-full"
                      style={{ 
                        left: `${(data.daily.temperature_2m_min[index] + 10) * 2}%`, 
                        right: `${100 - (data.daily.temperature_2m_max[index] + 10) * 2}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-[80px] justify-end">
                  {getWeatherIcon(data.daily.weather_code[index], 14)}
                  <div className="flex gap-2 text-[11px] font-medium">
                    <span className="text-white/70">{Math.round(data.daily.temperature_2m_max[index])}°</span>
                    <span className="text-white/20">{Math.round(data.daily.temperature_2m_min[index])}°</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
