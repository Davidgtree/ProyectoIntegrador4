import { useState, useEffect } from 'react';
import './CalendarPicker.css';

const HORA_INICIO = 9;
const HORA_FIN = 18;
const DURACION_CITA = 1; // en horas

export const CalendarPicker = ({ onDateTimeSelect, initialDate = null }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate ? new Date(initialDate) : null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Generar horarios disponibles para un día
  const generateTimeSlots = () => {
    const slots = [];
    for (let hora = HORA_INICIO; hora < HORA_FIN; hora++) {
      slots.push(`${String(hora).padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Obtener días del mes actual
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleDayClick = (day) => {
    if (day) {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      setSelectedDate(newDate);
      setSelectedTime(null);
    }
  };

  const handleTimeClick = (time) => {
    setSelectedTime(time);
    if (selectedDate) {
      const [hours, minutes] = time.split(':');
      const startDate = new Date(selectedDate);
      startDate.setHours(parseInt(hours), parseInt(minutes), 0);

      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + DURACION_CITA);

      onDateTimeSelect({
        inicio: startDate.toISOString(),
        fin: endDate.toISOString(),
      });
    }
  };

  const isDateSelected = (day) => {
    if (!day || !selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isDateInPast = (day) => {
    if (!day) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="calendar-picker">
      <div className="calendar-section">
        <div className="calendar-header">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="calendar-nav"
          >
            ←
          </button>
          <h3 className="calendar-month">
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="calendar-nav"
          >
            →
          </button>
        </div>

        <div className="calendar-grid">
          <div className="weekday">Dom</div>
          <div className="weekday">Lun</div>
          <div className="weekday">Mar</div>
          <div className="weekday">Mie</div>
          <div className="weekday">Jue</div>
          <div className="weekday">Vie</div>
          <div className="weekday">Sab</div>

          {days.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={!day || isDateInPast(day)}
              className={`calendar-day ${
                isDateSelected(day)
                  ? 'selected'
                  : day && !isDateInPast(day)
                    ? 'available'
                    : 'disabled'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="timeslots-section">
          <h4 className="timeslots-title">
            Turnos para el {selectedDate.toLocaleDateString('es-CO')}:
          </h4>
          <div className="timeslots-grid">
            {timeSlots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => handleTimeClick(time)}
                className={`timeslot ${selectedTime === time ? 'selected' : ''}`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
