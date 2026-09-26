import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Dimensions, Platform, TextInput, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// ⚡ CHANGE THIS to your Railway URL after deploying (e.g. https://mausam-ai-production.up.railway.app)
const API_BASE_URL = 'https://mauamai-production.up.railway.app';

const PERSONAS = [
  { id: 'commuter', label: 'Commute', icon: '🚌' },
  { id: 'fitness', label: 'Fitness', icon: '🏃' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'traveler', label: 'Travel', icon: '✈️' },
  { id: 'health', label: 'Health', icon: '🩺' },
  { id: 'adventure', label: 'Beach/Surf', icon: '🏄' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'event', label: 'Events', icon: '🎉' },
];

const WEATHER_ICONS: Record<string, string> = {
  Clear: '☀️', Sunny: '☀️', Clouds: '⛅', Cloudy: '🌥️',
  Rain: '🌧️', 'Light Rain': '🌦️', Thunderstorm: '⛈️',
  Snow: '❄️', Mist: '🌫️', Haze: '🌫️', Drizzle: '🌦️',
};

// --- Animated Card wrapper ---
function FadeSlideCard({ children, delay = 0, style }: any) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// --- Persona Chip ---
function PersonaChip({ persona, active, onPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress(persona.id);
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <Animated.View style={[styles.personaChip, active && styles.personaChipActive, { transform: [{ scale }] }]}>
        <Text style={styles.personaIcon}>{persona.icon}</Text>
        <Text style={[styles.personaLabel, active && styles.personaLabelActive]}>{persona.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// --- Rain Timeline ---
function RainTimeline({ rainProb }: { rainProb: number }) {
  const points = [
    { label: 'Now', value: rainProb },
    { label: '1h', value: Math.min(100, rainProb + 5) },
    { label: '3h', value: Math.max(10, rainProb - 12) },
    { label: '6h', value: Math.max(5, rainProb - 50) },
  ];
  const maxH = 80;

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineLine} />
      <View style={styles.timelinePoints}>
        {points.map((p, i) => {
          const dotBottom = (p.value / 100) * maxH;
          return (
            <View key={i} style={styles.timelineCol}>
              <Text style={styles.timelineValue}>{p.label}: {p.value}%</Text>
              <View style={[styles.timelineDot, { marginBottom: dotBottom }]} />
              <Text style={styles.timelineLabel}>{p.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ===================== MAIN APP =====================
export default function App() {
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [username, setUsername] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  
  const [activePersona, setActivePersona] = useState('fitness');
  const [triggerAlert, setTriggerAlert] = useState(false);
  const [destination, setDestination] = useState('');
  const [homeData, setHomeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing profile on startup
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('userProfile');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setUsername(profile.username);
          setLocationName(profile.location);
          setActivePersona(profile.persona);
          setIsOnboarding(false);
        }
      } catch (e) {
        console.warn("AsyncStorage unavailable, falling back to memory.", e);
      }
    };
    checkProfile();
  }, []);

  // In-memory fallback
  const [memoryProfile, setMemoryProfile] = useState<any>(null);

  const detectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to auto-detect.');
        setIsDetectingLocation(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode && geocode.length > 0) {
        const city = geocode[0].city || geocode[0].region || "Unknown City";
        setLocationName(city);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not detect location.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const completeOnboarding = async () => {
    if (!username.trim() || !locationName.trim()) {
      Alert.alert('Missing Info', 'Please enter your name and location.');
      return;
    }
    const profile = { username, location: locationName, persona: activePersona };
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    } catch (e) {
      console.warn("AsyncStorage unavailable, using memory.");
      setMemoryProfile(profile);
    }
    setIsOnboarding(false);
  };

  const fetchHomeData = async () => {
    if (isOnboarding) return;
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/api/personalized-home?persona=${activePersona}&location=${locationName}&username=${username}&trigger_alert=${triggerAlert}`;
      if (activePersona === 'traveler' && destination) {
        url += `&destination=${encodeURIComponent(destination)}`;
      }
      const response = await axios.get(url);
      setHomeData(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOnboarding) {
      // Debounce destination fetches slightly or rely on a "Search" button. We'll fetch immediately if changed, but limit in a real app.
      const timer = setTimeout(() => fetchHomeData(), 500);
      return () => clearTimeout(timer);
    }
  }, [activePersona, triggerAlert, isOnboarding, destination]);

  const updatePersona = async (newPersona: string) => {
    setActivePersona(newPersona);
    try {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        profile.persona = newPersona;
        await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      }
    } catch(e) {}
  };

  if (isOnboarding) {
    return (
      <LinearGradient colors={['#dbe9f8', '#eef3fa', '#f5f7fb']} style={styles.container}>
        <View style={styles.onboardingContainer}>
          <Text style={styles.headerTitle}>Welcome to Mausam AI+</Text>
          <Text style={styles.subtitle}>Let's personalize your weather.</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>What should we call you?</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Your Name" 
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Where are you located?</Text>
            <View style={styles.locationInputRow}>
              <TextInput 
                style={[styles.input, {flex: 1, marginBottom: 0}]} 
                placeholder="City Name" 
                value={locationName}
                onChangeText={setLocationName}
              />
              <TouchableOpacity style={styles.detectBtn} onPress={detectLocation} disabled={isDetectingLocation}>
                {isDetectingLocation ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.detectBtnText}>📍 Auto</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>What's your primary focus?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personaRow}>
              {PERSONAS.map(p => (
                <PersonaChip key={p.id} persona={p} active={activePersona === p.id} onPress={setActivePersona} />
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={completeOnboarding}>
            <Text style={styles.startBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const getWidget = (type: string) => homeData?.widgets?.find((w: any) => w.type === type);

  const currentWeather = getWidget('current_weather');
  const aqiWidget = getWidget('aqi');
  const uvWidget = getWidget('uv');
  const rainWidget = getWidget('rain_forecast') || getWidget('rain_probability');

  const temp = currentWeather?.data?.temp ?? '--';
  const condition = currentWeather?.data?.condition ?? 'Clear';
  const wind = currentWeather?.data?.wind ?? '--';
  const humidity = currentWeather?.data?.humidity ?? '--';
  const rainProb = currentWeather?.data?.rain_prob ?? 50;
  const aqiVal = aqiWidget?.data?.value ?? '--';
  const aqiStatus = aqiWidget?.data?.status ?? '--';
  const uvVal = uvWidget?.data?.index ?? '--';
  const uvStatus = uvWidget?.data?.status ?? '--';
  const weatherIcon = WEATHER_ICONS[condition] || '🌤️';

  return (
    <LinearGradient colors={['#dbe9f8', '#eef3fa', '#f5f7fb']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <FadeSlideCard delay={0} style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hello, {username}</Text>
            <Text style={styles.headerTitle}>Mausam AI+</Text>
          </View>
          <TouchableOpacity onPress={() => setIsOnboarding(true)}><Text style={styles.settingsIcon}>⚙️</Text></TouchableOpacity>
        </FadeSlideCard>

        <FadeSlideCard delay={50}>
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>📍 {locationName || "Unknown Location"}</Text>
          </View>
        </FadeSlideCard>

        <FadeSlideCard delay={100}>
          <TouchableOpacity
            style={[styles.alertBtn, triggerAlert && styles.alertBtnActive]}
            activeOpacity={0.8}
            onPress={() => setTriggerAlert(!triggerAlert)}
          >
            <Text style={styles.alertBtnText}>
              {triggerAlert ? '✅ Alert Active' : 'Trigger Mock Severe Alert'}
            </Text>
          </TouchableOpacity>
        </FadeSlideCard>

        {homeData?.alert && (
          <FadeSlideCard delay={0} style={styles.severeAlert}>
            <Text style={styles.severeAlertTitle}>⚠ SEVERE WEATHER ALERT</Text>
            <Text style={styles.severeAlertMsg}>{homeData.alert.message}</Text>
          </FadeSlideCard>
        )}

        <FadeSlideCard delay={150} style={styles.personaCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personaRow}>
            {PERSONAS.map(p => (
              <PersonaChip key={p.id} persona={p} active={activePersona === p.id} onPress={updatePersona} />
            ))}
          </ScrollView>
        </FadeSlideCard>

        {/* Destination input when traveler is active */}
        {activePersona === 'traveler' && (
          <FadeSlideCard delay={180}>
             <TextInput 
              style={[styles.input, {marginBottom: 14}]} 
              placeholder="Enter destination (e.g. Mumbai)" 
              value={destination}
              onChangeText={setDestination}
            />
          </FadeSlideCard>
        )}

        {loading && !homeData ? (
          <ActivityIndicator size="large" color="#5b9bd5" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : homeData ? (
          <>
            <FadeSlideCard delay={200} style={styles.glassCard}>
              <Text style={styles.cardTitle}>Current Conditions (AI-Derived)</Text>
              <View style={styles.currentRow}>
                <View style={styles.tempBlock}>
                  <Text style={styles.tempText}>{Math.round(temp)}°C</Text>
                  <Text style={styles.weatherEmoji}>{weatherIcon}</Text>
                </View>
                <View style={styles.conditionBlock}>
                  <Text style={styles.conditionText}>Condition: {condition}</Text>
                  <Text style={styles.conditionText}>Wind: {wind} m/s</Text>
                  <Text style={styles.conditionText}>Humidity: {humidity}%</Text>
                </View>
              </View>
            </FadeSlideCard>

            <FadeSlideCard delay={300} style={styles.dualRow}>
              <View style={[styles.glassCardSmall, { marginRight: 8 }]}>
                <Text style={styles.smallCardTitle}>Air Quality (AQI)</Text>
                <Text style={styles.smallCardValue}>{aqiVal}</Text>
                <Text style={styles.smallCardStatus}>({aqiStatus})</Text>
              </View>
              <View style={[styles.glassCardSmall, { marginLeft: 8 }]}>
                <Text style={styles.smallCardTitle}>UV Index</Text>
                <Text style={styles.smallCardValue}>{uvVal}</Text>
                <Text style={styles.smallCardStatus}>({uvStatus})</Text>
              </View>
            </FadeSlideCard>

            <FadeSlideCard delay={400} style={styles.glassCard}>
              <Text style={styles.cardTitle}>Rain Probability Timeline</Text>
              <RainTimeline rainProb={rainProb} />
            </FadeSlideCard>

            <FadeSlideCard delay={500} style={styles.glassCard}>
              <Text style={styles.cardTitle}>Forecast Summary</Text>
              <View style={styles.forecastRow}><Text style={styles.forecastDay}>Tomorrow:</Text><Text style={styles.forecastVal}>{Math.round(temp - 3)}/{Math.round(temp - 10)}, Thunderstorms ⛈️</Text></View>
              <View style={styles.forecastRow}><Text style={styles.forecastDay}>Thu:</Text><Text style={styles.forecastVal}>{Math.round(temp - 2)}/{Math.round(temp - 9)}, Cloudy 🌥️</Text></View>
              <View style={styles.forecastRow}><Text style={styles.forecastDay}>Fri:</Text><Text style={styles.forecastVal}>{Math.round(temp - 1)}/{Math.round(temp - 8)}, Mostly Sunny ☀️</Text></View>
            </FadeSlideCard>

            {/* Persona-Specific Widgets */}
            {homeData?.widgets?.filter((w: any) => !['current_weather', 'aqi', 'uv', 'rain_forecast', 'rain_probability'].includes(w.type)).map((widget: any, i: number) => {
              if (widget.type === 'route_weather') {
                return (
                  <FadeSlideCard key={`${widget.type}-${i}`} delay={600 + i * 100} style={styles.glassCard}>
                    <Text style={styles.cardTitle}>{widget.title}</Text>
                    {widget.data.message ? (
                      <Text style={styles.conditionText}>{widget.data.message}</Text>
                    ) : (
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10}}>
                         <View style={{alignItems: 'center'}}>
                           <Text style={{fontSize: 12, color: '#666'}}>Start</Text>
                           <Text style={{fontSize: 24}}>{WEATHER_ICONS[widget.data.origin.condition] || '🌤️'}</Text>
                           <Text style={{fontWeight: 'bold', fontSize: 16}}>{widget.data.origin.temp}°C</Text>
                         </View>
                         <Text style={{color: '#999'}}>→</Text>
                         <View style={{alignItems: 'center'}}>
                           <Text style={{fontSize: 12, color: '#666'}}>En Route</Text>
                           <Text style={{fontSize: 24}}>{WEATHER_ICONS[widget.data.midpoint.condition] || '☁️'}</Text>
                           <Text style={{fontWeight: 'bold', fontSize: 16}}>{widget.data.midpoint.temp}°C</Text>
                         </View>
                         <Text style={{color: '#999'}}>→</Text>
                         <View style={{alignItems: 'center'}}>
                           <Text style={{fontSize: 12, color: '#666'}}>End</Text>
                           <Text style={{fontSize: 24}}>{WEATHER_ICONS[widget.data.destination.condition] || '🌤️'}</Text>
                           <Text style={{fontWeight: 'bold', fontSize: 16}}>{widget.data.destination.temp}°C</Text>
                         </View>
                      </View>
                    )}
                    {widget.explanation && <Text style={styles.explanationText}>💡 {widget.explanation}</Text>}
                  </FadeSlideCard>
                );
              }

              return (
                <FadeSlideCard key={`${widget.type}-${i}`} delay={600 + i * 100} style={styles.glassCard}>
                  <Text style={styles.cardTitle}>{widget.title}</Text>
                  {Object.entries(widget.data).map(([key, value]) => (
                    <Text key={key} style={styles.conditionText}>
                      <Text style={{ fontWeight: '600' }}>{key.replace(/_/g, ' ')}: </Text>
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </Text>
                  ))}
                  {widget.explanation && (
                    <Text style={styles.explanationText}>💡 {widget.explanation}</Text>
                  )}
                </FadeSlideCard>
              );
            })}

            <View style={{ height: 100 }} />
          </>
        ) : null}
      </ScrollView>

      {/* ---- Bottom Tab Bar ---- */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabIconActive}>🏠</Text>
          <Text style={styles.tabLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabIcon}>🔍</Text>
          <Text style={styles.tabLabel}>Explore</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 50 },

  // Onboarding
  onboardingContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  subtitle: { fontSize: 16, color: '#4a5568', marginBottom: 30, textAlign: 'center' },
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1a2a3a', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 14, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#dbe9f8' },
  locationInputRow: { flexDirection: 'row', alignItems: 'center' },
  detectBtn: { backgroundColor: '#5b9bd5', padding: 14, borderRadius: 12, marginLeft: 10, justifyContent: 'center' },
  detectBtnText: { color: '#fff', fontWeight: 'bold' },
  startBtn: { backgroundColor: '#1a2a3a', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  greetingText: { fontSize: 14, color: '#4a5568', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1a2a3a' },
  settingsIcon: { fontSize: 24 },

  // Location badge
  locationBadge: { alignSelf: 'center', backgroundColor: '#5b9bd5', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  locationText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Alert button
  alertBtn: { alignSelf: 'center', borderWidth: 2, borderColor: '#e8a838', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 16 },
  alertBtnActive: { backgroundColor: '#e8a838' },
  alertBtnText: { color: '#333', fontWeight: '700', fontSize: 14 },

  // Severe alert
  severeAlert: { backgroundColor: '#fee2e2', borderWidth: 2, borderColor: '#ef4444', borderRadius: 16, padding: 16, marginBottom: 14 },
  severeAlertTitle: { fontSize: 16, fontWeight: '800', color: '#dc2626', marginBottom: 4 },
  severeAlertMsg: { fontSize: 14, color: '#991b1b' },

  // Persona selector
  personaCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 20, padding: 12, marginBottom: 14, ...Platform.select({ web: { backdropFilter: 'blur(12px)' }, default: {} }) },
  personaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 5 },
  personaChip: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, minWidth: 70 },
  personaChipActive: { backgroundColor: 'rgba(91,155,213,0.25)', borderRadius: 16 },
  personaIcon: { fontSize: 28, marginBottom: 4 },
  personaLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  personaLabelActive: { color: '#2a6496' },

  // Glass card
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      web: { backdropFilter: 'blur(14px)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2a3a4a', marginBottom: 12 },

  // Current conditions
  currentRow: { flexDirection: 'row', alignItems: 'center' },
  tempBlock: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  tempText: { fontSize: 48, fontWeight: '800', color: '#1a2a3a' },
  weatherEmoji: { fontSize: 40, marginLeft: 8 },
  conditionBlock: { flex: 1 },
  conditionText: { fontSize: 14, color: '#4a5568', marginBottom: 4, lineHeight: 20 },

  // Dual row (AQI + UV)
  dualRow: { flexDirection: 'row', marginBottom: 14 },
  glassCardSmall: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { backdropFilter: 'blur(14px)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    }),
  },
  smallCardTitle: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 6 },
  smallCardValue: { fontSize: 28, fontWeight: '800', color: '#1a2a3a' },
  smallCardStatus: { fontSize: 12, color: '#888', marginTop: 2 },

  // Rain timeline
  timelineContainer: { paddingVertical: 10 },
  timelineLine: { position: 'absolute', top: '50%', left: 20, right: 20, height: 2, backgroundColor: '#cbd5e0' },
  timelinePoints: { flexDirection: 'row', justifyContent: 'space-around' },
  timelineCol: { alignItems: 'center' },
  timelineValue: { fontSize: 11, fontWeight: '600', color: '#4a5568', marginBottom: 6 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5b9bd5', borderWidth: 2, borderColor: '#fff' },
  timelineLabel: { marginTop: 6, fontSize: 12, color: '#888' },

  // Forecast
  forecastRow: { flexDirection: 'row', marginBottom: 6 },
  forecastDay: { width: 90, fontSize: 14, fontWeight: '600', color: '#4a5568' },
  forecastVal: { flex: 1, fontSize: 14, color: '#4a5568' },

  // Explanation
  explanationText: { marginTop: 8, fontSize: 12, color: '#718096', fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.03)', padding: 8, borderRadius: 8 },

  // Error
  errorText: { color: 'red', textAlign: 'center', fontSize: 16, marginTop: 40 },

  // Bottom Tab Bar
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'web' ? 10 : 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      web: { backdropFilter: 'blur(14px)', boxShadow: '0 -2px 16px rgba(0,0,0,0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 8 },
    }),
  },
  tab: { alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 22 },
  tabIconActive: { fontSize: 22 },
  tabLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  tabLabelActive: { fontSize: 12, color: '#5b9bd5', fontWeight: '700', marginTop: 2 },
});
