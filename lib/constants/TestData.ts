// Helper to generate HH:MM time slots for a 24-hour day
const generateDayTimeSlots = () => {
    const slots = []
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = h.toString().padStart(2, '0')
            const minute = m.toString().padStart(2, '0')
            slots.push(`${hour}:${minute}`)
        }
    }
    return slots
}

const dayTimeSlots = generateDayTimeSlots() // Array of 48 slots ["00:00", "00:30", ...]

// Helper to generate fluctuating data
const fluctuate = (base: number, fluctuation: number) => base + (Math.random() - 0.5) * fluctuation

// --- New Statically-Timed Test Data ---

export const testTimeSlotData_sleep: Record<string, any> = {}
dayTimeSlots.forEach((slot) => {
    // Simulate sleep between 11 PM (23:00) and 7 AM (07:00)
    const hour = parseInt(slot.split(':')[0])
    const isAsleep = hour >= 23 || hour < 7
    testTimeSlotData_sleep[slot] = {
        sleepSessions: isAsleep ? 0.5 : 0, // 0.5 hours per 30-min slot
        heartRate: isAsleep ? fluctuate(55, 5) : fluctuate(70, 10),
        respiratoryRate: isAsleep ? fluctuate(14, 2) : fluctuate(18, 4),
        totalCalories: fluctuate(40, 10),
        hydration: 0,
    }
})

export const testTimeSlotData_training: Record<string, any> = {}
dayTimeSlots.forEach((slot) => {
    // Simulate a workout between 5 PM (17:00) and 6:30 PM (18:30)
    const hour = parseInt(slot.split(':')[0])
    const minute = parseInt(slot.split(':')[1])
    const isTraining = hour === 17 || (hour === 18 && minute < 30)
    testTimeSlotData_training[slot] = {
        steps: isTraining ? fluctuate(2000, 500) : fluctuate(100, 50),
        totalCalories: isTraining ? fluctuate(150, 30) : fluctuate(50, 10),
        heartRate: isTraining ? fluctuate(140, 20) : fluctuate(75, 10),
        sleepSessions: 0,
        bodyTemperature: isTraining ? fluctuate(37.5, 0.5) : fluctuate(36.8, 0.2),
    }
})

export const testTimeSlotData_BP_fluctuations: Record<string, any> = {}
dayTimeSlots.forEach((slot) => {
    // Simulate a stressful work period between 2 PM (14:00) and 4 PM (16:00)
    const hour = parseInt(slot.split(':')[0])
    const isStressed = hour >= 14 && hour < 16
    testTimeSlotData_BP_fluctuations[slot] = {
        bloodPressureSystolic: isStressed ? fluctuate(135, 5) : fluctuate(120, 4),
        bloodPressureDiastolic: isStressed ? fluctuate(88, 4) : fluctuate(80, 3),
        heartRate: isStressed ? fluctuate(85, 8) : fluctuate(68, 5),
        steps: fluctuate(50, 20),
        sleepSessions: 0,
    }
})

export const testTimeSlotData_blood_glucose: Record<string, any> = {}
dayTimeSlots.forEach((slot) => {
    // Simulate post-lunch glucose spike around 1 PM (13:00)
    const hour = parseInt(slot.split(':')[0])
    const postMeal = hour >= 13 && hour < 15 // Spike lasts for 2 hours
    testTimeSlotData_blood_glucose[slot] = {
        bloodGlucose: postMeal ? fluctuate(140, 20) : fluctuate(95, 5),
        totalCalories: hour === 13 ? fluctuate(100, 20) : fluctuate(50, 10),
        steps: fluctuate(50, 20),
        sleepSessions: 0,
        hydration: hour === 13 ? 0.25 : 0.1,
    }
})

export const testTimeSlotData_oxygen_saturation: Record<string, any> = {}
dayTimeSlots.forEach((slot) => {
    // Simulate a dip during deep sleep, around 3 AM - 5 AM
    const hour = parseInt(slot.split(':')[0])
    const isDip = hour >= 3 && hour < 5
    testTimeSlotData_oxygen_saturation[slot] = {
        oxygenSaturation: isDip ? fluctuate(94, 1) : fluctuate(98, 1),
        heartRate: isDip ? fluctuate(58, 5) : fluctuate(68, 5),
        respiratoryRate: isDip ? fluctuate(14, 2) : fluctuate(16, 2),
        sleepSessions: isDip ? 0.5 : 0,
        steps: fluctuate(50, 20),
        bodyTemperature: fluctuate(36.9, 0.3),
    }
})
