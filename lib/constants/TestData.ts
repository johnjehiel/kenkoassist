// Helper function to generate dates for the past 7 days
const getPastDays = (numDays: number) => {
    const dates: Record<number, string> = {};
    const today = new Date();
    
    for (let i = 0; i < numDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        dates[i] = dateString;
    }
    
    return dates;
};

const pastDays = getPastDays(7);

export const testDailyData_sleep = {
    [pastDays[6]]: {
        "sleepSessions": 7.8,
        "heartRate": 62,
        "respiratoryRate": 15,
        "totalCalories": 2300,
        "hydration": 2.5
    },
    [pastDays[5]]: {
        "sleepSessions": 7.5,
        "heartRate": 60,
        "respiratoryRate": 14,
        "totalCalories": 2250,
        "hydration": 2.4
    },
    [pastDays[4]]: {
        "sleepSessions": 4.0,
        "heartRate": 75,
        "respiratoryRate": 19,
        "totalCalories": 2800,
        "hydration": 1.0
    },
    [pastDays[3]]: {
        "sleepSessions": 5.2,
        "heartRate": 72,
        "respiratoryRate": 18,
        "totalCalories": 2750,
        "hydration": 1.2
    },
    [pastDays[2]]: {
        "sleepSessions": 4.5,
        "heartRate": 78,
        "respiratoryRate": 20,
        "totalCalories": 2900,
        "hydration": 0.8
    },
    [pastDays[1]]: {
        "sleepSessions": 5.0,
        "heartRate": 70,
        "respiratoryRate": 17,
        "totalCalories": 2600,
        "hydration": 1.5
    },
    [pastDays[0]]: {
        "sleepSessions": 6.1,
        "heartRate": 68,
        "respiratoryRate": 16,
        "totalCalories": 2400,
        "hydration": 2.0
    }
}

export const testDailyData_training = {
    [pastDays[6]]: {
        "steps": 10000,
        "totalCalories": 2800,
        "heartRate": 58,
        "sleepSessions": 8.0,
        "bodyTemperature": 36.8
    },
    [pastDays[5]]: {
        "steps": 12000,
        "totalCalories": 3000,
        "heartRate": 57,
        "sleepSessions": 7.9,
        "bodyTemperature": 36.9
    },
    [pastDays[4]]: {
        "steps": 11500,
        "totalCalories": 2900,
        "heartRate": 60,
        "sleepSessions": 7.5,
        "bodyTemperature": 37.0
    },
    [pastDays[3]]: {
        "steps": 13000,
        "totalCalories": 3200,
        "heartRate": 65,
        "sleepSessions": 6.8,
        "bodyTemperature": 37.1
    },
    [pastDays[2]]: {
        "steps": 14000,
        "totalCalories": 3300,
        "heartRate": 68,
        "sleepSessions": 6.5,
        "bodyTemperature": 37.2
    },
    [pastDays[1]]: {
        "steps": 12500,
        "totalCalories": 3100,
        "heartRate": 67,
        "sleepSessions": 6.9,
        "bodyTemperature": 37.1
    },
    [pastDays[0]]: {
        "steps": 8000,
        "totalCalories": 2500,
        "heartRate": 62,
        "sleepSessions": 7.5,
        "bodyTemperature": 36.9
    }
}

export const testDailyData_BP_fluctuations = {
    [pastDays[6]]: {
        "bloodPressureSystolic": 120,
        "bloodPressureDiastolic": 80,
        "heartRate": 65,
        "steps": 7000,
        "sleepSessions": 7.0
    },
    [pastDays[5]]: {
        "bloodPressureSystolic": 122,
        "bloodPressureDiastolic": 81,
        "heartRate": 66,
        "steps": 7200,
        "sleepSessions": 7.2
    },
    [pastDays[4]]: {
        "bloodPressureSystolic": 135,
        "bloodPressureDiastolic": 88,
        "heartRate": 72,
        "steps": 4000,
        "sleepSessions": 6.0
    },
    [pastDays[3]]: {
        "bloodPressureSystolic": 140,
        "bloodPressureDiastolic": 92,
        "heartRate": 75,
        "steps": 3500,
        "sleepSessions": 5.8
    },
    [pastDays[2]]: {
        "bloodPressureSystolic": 138,
        "bloodPressureDiastolic": 90,
        "heartRate": 73,
        "steps": 4200,
        "sleepSessions": 6.2
    },
    [pastDays[1]]: {
        "bloodPressureSystolic": 130,
        "bloodPressureDiastolic": 85,
        "heartRate": 70,
        "steps": 5500,
        "sleepSessions": 6.5
    },
    [pastDays[0]]: {
        "bloodPressureSystolic": 125,
        "bloodPressureDiastolic": 82,
        "heartRate": 68,
        "steps": 6000,
        "sleepSessions": 6.8
    }
}

export const testDailyData_blood_glucose = {
    [pastDays[6]]: {
        "bloodGlucose": 95,
        "totalCalories": 2200,
        "steps": 6000,
        "sleepSessions": 7.0,
        "hydration": 2.0
    },
    [pastDays[5]]: {
        "bloodGlucose": 98,
        "totalCalories": 2300,
        "steps": 6500,
        "sleepSessions": 7.2,
        "hydration": 2.3
    },
    [pastDays[4]]: {
        "bloodGlucose": 130,
        "totalCalories": 3000,
        "steps": 4000,
        "sleepSessions": 6.0,
        "hydration": 2.8
    },
    [pastDays[3]]: {
        "bloodGlucose": 160,
        "totalCalories": 3200,
        "steps": 3000,
        "sleepSessions": 5.5,
        "hydration": 3.2
    },
    [pastDays[2]]: {
        "bloodGlucose": 145,
        "totalCalories": 2800,
        "steps": 5800,
        "sleepSessions": 6.5,
        "hydration": 2.6
    },
    [pastDays[1]]: {
        "bloodGlucose": 140,
        "totalCalories": 2500,
        "steps": 6200,
        "sleepSessions": 7.0,
        "hydration": 2.7
    },
    [pastDays[0]]: {
        "bloodGlucose": 135,
        "totalCalories": 2800,
        "steps": 6500,
        "sleepSessions": 7.1,
        "hydration": 2.5
    }
}

export const testDailyData_oxygen_saturation = {
    [pastDays[6]]: {
        "oxygenSaturation": 98,
        "heartRate": 65,
        "respiratoryRate": 14,
        "sleepSessions": 7.5,
        "steps": 7000,
        "bodyTemperature": 36.9
    },
    [pastDays[5]]: {
        "oxygenSaturation": 97,
        "heartRate": 67,
        "respiratoryRate": 15,
        "sleepSessions": 7.2,
        "steps": 6800,
        "bodyTemperature": 37.0
    },
    [pastDays[4]]: {
        "oxygenSaturation": 96,
        "heartRate": 70,
        "respiratoryRate": 17,
        "sleepSessions": 6.8,
        "steps": 5000,
        "bodyTemperature": 37.1
    },
    [pastDays[3]]: {
        "oxygenSaturation": 94,
        "heartRate": 75,
        "respiratoryRate": 20,
        "sleepSessions": 6.5,
        "steps": 5000,
        "bodyTemperature": 37.3
    },
    [pastDays[2]]: {
        "oxygenSaturation": 93,
        "heartRate": 78,
        "respiratoryRate": 22,
        "sleepSessions": 6.5,
        "steps": 4500,
        "bodyTemperature": 37.5
    },
    [pastDays[1]]: {
        "oxygenSaturation": 94,
        "heartRate": 76,
        "respiratoryRate": 21,
        "sleepSessions": 8,
        "steps": 4500,
        "bodyTemperature": 37.4
    },
    [pastDays[0]]: {
        "oxygenSaturation": 95,
        "heartRate": 72,
        "respiratoryRate": 19,
        "sleepSessions": 8,
        "steps": 4500,
        "bodyTemperature": 37.2
    }
}


export const testDailyData_sleep_aggregate = {
    sleepSessions: Object.values(testDailyData_sleep).reduce((sum, day) => sum + day.sleepSessions, 0),
    heartRate: Math.round(Object.values(testDailyData_sleep).reduce((sum, day) => sum + day.heartRate, 0) / Object.keys(testDailyData_sleep).length),
    respiratoryRate: Math.round(Object.values(testDailyData_sleep).reduce((sum, day) => sum + day.respiratoryRate, 0) / Object.keys(testDailyData_sleep).length),
    totalCalories: Object.values(testDailyData_sleep).reduce((sum, day) => sum + day.totalCalories, 0),
    hydration: Object.values(testDailyData_sleep).reduce((sum, day) => sum + day.hydration, 0)
}

export const testDailyData_training_aggregate = {
    steps: Object.values(testDailyData_training).reduce((sum, day) => sum + day.steps, 0),
    totalCalories: Object.values(testDailyData_training).reduce((sum, day) => sum + day.totalCalories, 0),
    heartRate: Math.round(Object.values(testDailyData_training).reduce((sum, day) => sum + day.heartRate, 0) / Object.keys(testDailyData_training).length),
    sleepSessions: Object.values(testDailyData_training).reduce((sum, day) => sum + day.sleepSessions, 0),
    bodyTemperature: Object.values(testDailyData_training).reduce((sum, day) => sum + day.bodyTemperature, 0) / Object.keys(testDailyData_training).length
}

export const testDailyData_BP_fluctuations_aggregate = {
    bloodPressureSystolic: Math.round(Object.values(testDailyData_BP_fluctuations).reduce((sum, day) => sum + day.bloodPressureSystolic, 0) / Object.keys(testDailyData_BP_fluctuations).length),
    bloodPressureDiastolic: Math.round(Object.values(testDailyData_BP_fluctuations).reduce((sum, day) => sum + day.bloodPressureDiastolic, 0) / Object.keys(testDailyData_BP_fluctuations).length),
    heartRate: Math.round(Object.values(testDailyData_BP_fluctuations).reduce((sum, day) => sum + day.heartRate, 0) / Object.keys(testDailyData_BP_fluctuations).length),
    steps: Object.values(testDailyData_BP_fluctuations).reduce((sum, day) => sum + day.steps, 0),
    sleepSessions: Object.values(testDailyData_BP_fluctuations).reduce((sum, day) => sum + day.sleepSessions, 0)
}

export const testDailyData_blood_glucose_aggregate = {
    bloodGlucose: Math.round(Object.values(testDailyData_blood_glucose).reduce((sum, day) => sum + day.bloodGlucose, 0) / Object.keys(testDailyData_blood_glucose).length),
    totalCalories: Object.values(testDailyData_blood_glucose).reduce((sum, day) => sum + day.totalCalories, 0),
    steps: Object.values(testDailyData_blood_glucose).reduce((sum, day) => sum + day.steps, 0),
    sleepSessions: Object.values(testDailyData_blood_glucose).reduce((sum, day) => sum + day.sleepSessions, 0),
    hydration: Object.values(testDailyData_blood_glucose).reduce((sum, day) => sum + day.hydration, 0)
}

export const testDailyData_oxygen_saturation_aggregate = {
    oxygenSaturation: Math.round(Object.values(testDailyData_oxygen_saturation).reduce((sum, day) => sum + day.oxygenSaturation, 0) / Object.keys(testDailyData_oxygen_saturation).length),
    heartRate: Math.round(Object.values(testDailyData_oxygen_saturation).reduce((sum, day) => sum + day.heartRate, 0) / Object.keys(testDailyData_oxygen_saturation).length),
    respiratoryRate: Math.round(Object.values(testDailyData_oxygen_saturation).reduce((sum, day) => sum + day.respiratoryRate, 0) / Object.keys(testDailyData_oxygen_saturation).length),
    sleepSessions: Object.values(testDailyData_oxygen_saturation).reduce((sum, day) => sum + day.sleepSessions, 0),
    steps: Object.values(testDailyData_oxygen_saturation).reduce((sum, day) => sum + day.steps, 0),
    bodyTemperature: Object.values(testDailyData_oxygen_saturation).reduce((sum, day) => sum + day.bodyTemperature, 0) / Object.keys(testDailyData_oxygen_saturation).length
}