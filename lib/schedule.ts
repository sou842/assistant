import ScheduleTask from '@/lib/models/ScheduleTask';
import ScheduleTaskRun from '@/lib/models/ScheduleTaskRun';

export function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export function computeNextRunAt(task: any, from = new Date()) {
  if (task.scheduleType === 'one_time') {
    return task.runAt ? new Date(task.runAt) : null;
  }

  if (task.intervalMinutes && Number(task.intervalMinutes) > 0) {
    return new Date(from.getTime() + Number(task.intervalMinutes) * 60_000);
  }

  return null;
}

async function getWeatherMessage(city?: string) {
  const location = city || 'Kolkata';
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
  const geoData = await geoRes.json();

  if (!geoData?.results?.length) {
    throw new Error(`Could not find location for weather report: ${location}`);
  }

  const lat = geoData.results[0].latitude;
  const lon = geoData.results[0].longitude;

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
  );
  const weather = await weatherRes.json();
  const current = weather?.current_weather;

  if (!current) throw new Error('Weather API returned no current_weather data');

  return `Weather report for ${location}: ${current.temperature}°C, wind ${current.windspeed} km/h.`;
}

async function sendWhatsappMessage(to: string, message: string) {
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;

  if (!idInstance || !apiTokenInstance) {
    throw new Error('Missing Green API credentials (GREEN_API_ID_INSTANCE or GREEN_API_TOKEN_INSTANCE)');
  }

  const cleanNumber = cleanPhone(to);
  const chatId = `${cleanNumber}@c.us`;

  const res = await fetch(`https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Green API error: ${errText}`);
  }

  return res.json();
}

export async function executeScheduleTask(task: any) {
  const startedAt = new Date();

  try {
    let message = '';

    if (task.actionType === 'weather_report') {
      const weatherMessage = await getWeatherMessage(task.payload?.city);
      message = task.payload?.messagePrefix ? `${task.payload.messagePrefix} ${weatherMessage}` : weatherMessage;
      await sendWhatsappMessage(task.payload?.phone, message);
    } else if (task.actionType === 'reminder') {
      message = task.payload?.message || 'Reminder';
      await sendWhatsappMessage(task.payload?.phone, message);
    } else {
      throw new Error(`Unsupported actionType: ${task.actionType}`);
    }

    const endedAt = new Date();
    await ScheduleTaskRun.create({
      taskId: task._id,
      startedAt,
      endedAt,
      status: 'success',
      response: { message },
    });

    const nextRunAt = computeNextRunAt(task, endedAt);
    const isOneTime = task.scheduleType === 'one_time';

    await ScheduleTask.findByIdAndUpdate(task._id, {
      lastRunAt: endedAt,
      nextRunAt: isOneTime ? null : nextRunAt,
      status: isOneTime ? 'completed' : 'active',
      isRunning: false,
      lastError: null,
    });

    return { success: true, message };
  } catch (error: any) {
    const endedAt = new Date();
    await ScheduleTaskRun.create({
      taskId: task._id,
      startedAt,
      endedAt,
      status: 'failed',
      error: error?.message || 'Unknown error',
    });

    await ScheduleTask.findByIdAndUpdate(task._id, {
      lastRunAt: endedAt,
      isRunning: false,
      status: 'failed',
      lastError: error?.message || 'Unknown error',
      nextRunAt: task.scheduleType === 'recurring' ? computeNextRunAt(task, endedAt) : null,
    });

    return { success: false, error: error?.message || 'Unknown error' };
  }
}
