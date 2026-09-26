import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function WeatherWidget({ widget }) {
    const { title, data, type, priority, explanation } = widget;
    const [showExplanation, setShowExplanation] = useState(false);

    const isAlert = type === 'severe_alert';

    return (
        <View style={[styles.card, isAlert && styles.alertCard]}>
            <Text style={[styles.title, isAlert && styles.alertText]}>{title}</Text>
            
            {type === 'current_weather' && (
                <View>
                    <Text style={styles.dataText}>Temp: {data.temp}°C | Condition: {data.condition}</Text>
                    <Text style={styles.dataText}>Wind: {data.wind} m/s | Humidity: {data.humidity}%</Text>
                </View>
            )}

            {type === 'running_window' && (
                <View>
                    <Text style={styles.dataText}>Status: {data.status}</Text>
                    <Text style={styles.dataText}>Time: {data.time}</Text>
                </View>
            )}

            {type === 'commute_window' && (
                <View>
                    <Text style={styles.dataText}>Status: {data.status}</Text>
                    <Text style={styles.dataText}>Delay Probability: {data.delay_prob}</Text>
                    <Text style={[styles.dataText, {fontStyle: 'italic'}]}>💡 {data.advice}</Text>
                </View>
            )}

            {type === 'packing_recommendation' && (
                <View>
                    <Text style={styles.dataText}>Suggested Items: {data.items?.join(", ")}</Text>
                </View>
            )}

            {type === 'severe_alert' && (
                <View>
                    <Text style={[styles.dataText, styles.alertText]}>{data.message}</Text>
                </View>
            )}

            {!['current_weather', 'running_window', 'commute_window', 'packing_recommendation', 'severe_alert'].includes(type) && (
                <View>
                    {Object.entries(data).map(([key, value]) => (
                        <Text key={key} style={styles.dataText}>
                            <Text style={{fontWeight: 'bold', textTransform: 'capitalize'}}>{key.replace('_', ' ')}: </Text>
                            {String(value)}
                        </Text>
                    ))}
                </View>
            )}
            
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => setShowExplanation(!showExplanation)}>
                    <Text style={styles.explainBtn}>
                        {showExplanation ? "Hide Explanation" : "Why am I seeing this?"}
                    </Text>
                </TouchableOpacity>
                {showExplanation && explanation && (
                    <Text style={styles.explanationText}>{explanation}</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    alertCard: {
        backgroundColor: '#ffebee',
        borderColor: '#f44336',
        borderWidth: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    alertText: {
        color: '#d32f2f',
    },
    dataText: {
        fontSize: 16,
        color: '#555',
        marginBottom: 4,
    },
    footer: {
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    priorityText: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
    },
    explainBtn: {
        fontSize: 14,
        color: '#007bff',
        fontWeight: '500',
    },
    explanationText: {
        marginTop: 6,
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f9f9f9',
        padding: 8,
        borderRadius: 4,
    }
});
