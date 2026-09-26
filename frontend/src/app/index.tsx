import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Platform, Dimensions,
  Alert, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { Image } from 'react-native';

const LogoImage = require('../../assets/images/app-icon.jpg');

const { width } = Dimensions.get('window');

const API_BASE_URL = 'https://mauamai-production.up.railway.app';

const PERSONAS = [
  { id: 'fitness',     label: 'Fitness',     icon: '🏃' },
  { id: 'agriculture', label: 'Agriculture',  icon: '🌾' },
  { id: 'traveler',    label: 'Travel',       icon: '✈️' },
  { id: 'beach',       label: 'Beach/Surf',   icon: '🏄' },
  { id: 'health',      label: 'Health',       icon: '🩺' },
  { id: 'commuter',    label: 'Commute',      icon: '🚌' },
  { id: 'family',      label: 'Family',       icon: '👨‍👩‍👧' },
  { id: 'event',       label: 'Events',       icon: '🎉' },
];

const WEATHER_ICONS: { [key: string]: string } = {
  'Clear': '☀️', 'Sunny': '☀️', 'Clouds': '☁️', 'Cloudy': '🌥️',
  'Rain': '🌧️', 'Drizzle': '🌦️', 'Thunderstorm': '⛈️', 'Snow': '❄️',
  'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️',
};

// ── Fade + slide in animation wrapper ─────────────────────────
function FadeSlide({ children, delay = 0, style }: any) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 480, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── SVG Rain Probability Curve ─────────────────────────────────
function RainCurve({ rainProb }: { rainProb: number }) {
  const W = width - 64;
  const H = 72;
  const p = (x: number, frac: number) => ({
    x,
    y: H - Math.max(4, (rainProb * frac * H) / 100),
  });
  const pts = [p(0, 0.3), p(W * 0.25, 0.55), p(W * 0.5, 1.0), p(W * 0.75, 0.7), p(W, 0.4)];
  const d = `M${pts[0].x},${pts[0].y} C${pts[0].x + W * 0.1},${pts[0].y} ${pts[1].x - W * 0.1},${pts[1].y} ${pts[1].x},${pts[1].y} S${pts[2].x - W * 0.08},${pts[2].y} ${pts[2].x},${pts[2].y} S${pts[3].x - W * 0.08},${pts[3].y} ${pts[3].x},${pts[3].y} S${pts[4].x - W * 0.08},${pts[4].y} ${pts[4].x},${pts[4].y}`;
  const labels = ['Now', '1h', '3h', '6h'];
  return (
    <View>
      {['100%', '50%', '0%'].map(l => (
        <Text key={l} style={styles.curveAxisLabel}>{l}</Text>
      ))}
      <Svg width={W} height={H + 22}>
        <Path d={d} stroke="rgba(86,204,242,0.9)" strokeWidth="2.5" fill="none" />
        {[pts[0], pts[1], pts[2], pts[3]].map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#56ccf2" />
        ))}
        {[pts[0].x, pts[1].x, pts[2].x, pts[3].x].map((x, i) => (
          <SvgText key={i} x={x} y={H + 18} fontSize="11" fill="rgba(255,255,255,0.55)" textAnchor="middle">
            {labels[i]}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [isOnboarding, setIsOnboarding]           = useState(true);
  const [username, setUsername]                   = useState('');
  const [locationName, setLocationName]           = useState('');
  const [activePersona, setActivePersona]         = useState('fitness');
  const [destination, setDestination]             = useState('');
  const [homeData, setHomeData]                   = useState<any>(null);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState<string | null>(null);
  const [triggerAlert, setTriggerAlert]           = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [memoryProfile, setMemoryProfile]         = useState<any>(null);
  const [showSearch, setShowSearch]               = useState(false);
  const [searchCity, setSearchCity]               = useState('');
  const [activeTab, setActiveTab]                 = useState('dashboard');

  // Load saved profile
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userProfile');
        if (raw) {
          const p = JSON.parse(raw);
          setUsername(p.username || '');
          setLocationName(p.location || '');
          setActivePersona(p.persona || 'fitness');
          setIsOnboarding(false);
        }
      } catch {
        if (memoryProfile) {
          setUsername(memoryProfile.username || '');
          setLocationName(memoryProfile.location || '');
          setActivePersona(memoryProfile.persona || 'fitness');
          setIsOnboarding(false);
        }
      }
    })();
  }, []);

  const detectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo?.length) setLocationName(geo[0].city || geo[0].region || 'Unknown');
    } catch { Alert.alert('Error', 'Could not detect location.'); }
    finally { setIsDetectingLocation(false); }
  };

  const completeOnboarding = async () => {
    if (!username.trim() || !locationName.trim()) { Alert.alert('Missing Info', 'Please enter your name and city.'); return; }
    const profile = { username, location: locationName, persona: activePersona };
    try { await AsyncStorage.setItem('userProfile', JSON.stringify(profile)); }
    catch { setMemoryProfile(profile); }
    setIsOnboarding(false);
  };

  const fetchHomeData = async () => {
    if (isOnboarding) return;
    setLoading(true); setError(null);
    try {
      let url = `${API_BASE_URL}/api/personalized-home?persona=${activePersona}&location=${locationName}&username=${username}&trigger_alert=${triggerAlert}`;
      if (activePersona === 'traveler' && destination) url += `&destination=${encodeURIComponent(destination)}`;
      const res = await axios.get(url);
      setHomeData(res.data);
    } catch { setError('Failed to fetch weather data. Check connection.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isOnboarding) {
      const t = setTimeout(() => fetchHomeData(), 500);
      return () => clearTimeout(t);
    }
  }, [activePersona, triggerAlert, isOnboarding, destination, locationName]);

  const updatePersona = async (id: string) => {
    setActivePersona(id);
    try {
      const raw = await AsyncStorage.getItem('userProfile');
      if (raw) { const p = JSON.parse(raw); p.persona = id; await AsyncStorage.setItem('userProfile', JSON.stringify(p)); }
    } catch {}
  };

  // ── ONBOARDING ────────────────────────────────────────────────
  if (isOnboarding) {
    return (
      <LinearGradient colors={['#0d1b3e', '#162754', '#1e3a6e']} style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.obScroll}>
            <View style={styles.obHeader}>
              <Image source={LogoImage} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 12, resizeMode: 'cover' }} />
              <Text style={styles.obTitle}>MAUSAM SATHI</Text>
              <Text style={styles.obIMD}>INDIA METEOROLOGICAL DEPARTMENT</Text>
            </View>

            <View style={styles.glassCard}>
              <Text style={styles.obWelcome}>Let's personalize your weather experience.</Text>

              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="rgba(255,255,255,0.35)" value={username} onChangeText={setUsername} />

              <Text style={styles.inputLabel}>Your City</Text>
              <View style={styles.locationRow}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="City name" placeholderTextColor="rgba(255,255,255,0.35)" value={locationName} onChangeText={setLocationName} />
                <TouchableOpacity style={styles.detectBtn} onPress={detectLocation} disabled={isDetectingLocation}>
                  {isDetectingLocation ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 20 }}>📍</Text>}
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Primary Focus</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 8 }}>
                  {PERSONAS.map(p => (
                    <TouchableOpacity key={p.id} onPress={() => setActivePersona(p.id)} style={[styles.obChip, activePersona === p.id && styles.obChipActive]}>
                      <Text style={{ fontSize: 26 }}>{p.icon}</Text>
                      <Text style={[styles.obChipLabel, activePersona === p.id && styles.obChipLabelActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.startBtn} onPress={completeOnboarding}>
                <Text style={styles.startBtnText}>Get Started →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── DERIVED DATA ──────────────────────────────────────────────
  const getW = (type: string) => homeData?.widgets?.find((w: any) => w.type === type);
  const currentW = getW('current_weather');
  const aqiW    = getW('aqi');
  const uvW     = getW('uv');

  const temp      = currentW?.data?.temp      ?? '--';
  const condition = currentW?.data?.condition ?? 'Clear';
  const wind      = currentW?.data?.wind      ?? '--';
  const humidity  = currentW?.data?.humidity  ?? '--';
  const rainProb  = currentW?.data?.rain_prob ?? 50;
  const aqiVal    = aqiW?.data?.value         ?? '--';
  const uvVal     = uvW?.data?.index          ?? '--';
  const wIcon     = WEATHER_ICONS[condition]  ?? '🌤️';

  const aqiBg = (v: any) => {
    const n = Number(v);
    if (n <= 50)  return 'rgba(0,200,100,0.22)';
    if (n <= 100) return 'rgba(255,220,0,0.18)';
    if (n <= 150) return 'rgba(255,140,0,0.22)';
    return 'rgba(255,60,60,0.22)';
  };

  // ── MAIN SCREEN ───────────────────────────────────────────────
  return (
    <LinearGradient colors={['#0d1b3e', '#0f2147', '#132158']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>

        {/* ── HEADER ── */}
        <FadeSlide delay={0}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={LogoImage} style={{ width: 40, height: 40, borderRadius: 20, resizeMode: 'cover', marginRight: 10 }} />
              <View>
                <Text style={styles.appTitle}>MAUSAM SATHI</Text>
                <Text style={styles.imdText}>INDIA METEOROLOGICAL DEPARTMENT</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsOnboarding(true)} style={{ opacity: 0.4 }}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </FadeSlide>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {activeTab === 'maps' && (
            <FadeSlide delay={0}>
              <View style={[styles.glassCard, { marginTop: 40, alignItems: 'center', paddingVertical: 60 }]}>
                <Text style={{ fontSize: 60, marginBottom: 20 }}>🗺️</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>Interactive Map</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 10 }}>
                  Showing radar and weather layers for {locationName}. (Map integration active)
                </Text>
              </View>
            </FadeSlide>
          )}

          {activeTab === 'alerts' && (
            <FadeSlide delay={0}>
              <View style={[styles.glassCard, { marginTop: 40 }]}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>🔔 Active Alerts</Text>
                {homeData?.alert ? (
                  <View style={[styles.severeAlert, { marginBottom: 15 }]}>
                    <Text style={styles.severeTitle}>⚠ {homeData.alert.message}</Text>
                    <Text style={{ color: '#fff', opacity: 0.8, marginTop: 5 }}>Issued for {locationName}</Text>
                  </View>
                ) : (
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>No severe weather alerts for {locationName} at this time.</Text>
                )}
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 }} />
                <Text style={{ color: '#fff', fontSize: 16 }}>Regional Advisories</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>All clear.</Text>
              </View>
            </FadeSlide>
          )}

          {activeTab === 'dashboard' && (
            <>
              {/* ── LOCATION BAR ── */}
              <FadeSlide delay={80}>
            <View style={styles.locationBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Text style={{ fontSize: 15 }}>📍</Text>
                <Text style={styles.locName} numberOfLines={1}>{locationName.toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.savedBtn} onPress={() => { setShowSearch(v => !v); setSearchCity(''); }}>
                <Text style={styles.savedBtnTxt}>{showSearch ? '✕ Close' : '🔍 Change City'}</Text>
              </TouchableOpacity>
            </View>

            {showSearch && (
              <View style={[styles.glassCard, { marginTop: 4, paddingVertical: 10 }]}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput 
                    style={[styles.input, { flex: 1, marginBottom: 0, height: 44 }]} 
                    placeholder="Search a city... (e.g. Pune)" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                    value={searchCity} 
                    onChangeText={setSearchCity} 
                    onSubmitEditing={() => { 
                      if (searchCity.trim()) { 
                        setLocationName(searchCity.trim()); 
                        setShowSearch(false); 
                      } 
                    }}
                    returnKeyType="search"
                  />
                  <TouchableOpacity 
                    style={[styles.detectBtn, { width: 50, height: 44, borderRadius: 10 }]} 
                    onPress={() => {
                      if (searchCity.trim()) { 
                        setLocationName(searchCity.trim()); 
                        setShowSearch(false); 
                      }
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>Go</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </FadeSlide>

          {/* ── PERSONA CHIPS ── */}
          <FadeSlide delay={140}>
            <View style={styles.glassCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 18, paddingHorizontal: 2 }}>
                  {PERSONAS.map(p => (
                    <TouchableOpacity key={p.id} onPress={() => updatePersona(p.id)} style={{ alignItems: 'center', gap: 6 }}>
                      <View style={[styles.pIconCircle, activePersona === p.id && styles.pIconCircleActive]}>
                        <Text style={{ fontSize: 22 }}>{p.icon}</Text>
                      </View>
                      <Text style={[styles.pLabel, activePersona === p.id && styles.pLabelActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </FadeSlide>

          {/* ── DESTINATION (Travel) ── */}
          {activePersona === 'traveler' && (
            <FadeSlide delay={170}>
              <TextInput style={[styles.glassCard, styles.destInput]} placeholder="Enter destination (e.g. Mumbai)" placeholderTextColor="rgba(255,255,255,0.35)" value={destination} onChangeText={setDestination} />
            </FadeSlide>
          )}

          {/* ── SEVERE ALERT ── */}
          {homeData?.alert && (
            <FadeSlide delay={0}>
              <View style={styles.severeAlert}>
                <Text style={styles.severeTitle}>⚠ SEVERE WEATHER ALERT</Text>
                <Text style={styles.severeMsg}>{homeData.alert.message}</Text>
              </View>
            </FadeSlide>
          )}

          {loading && !homeData ? (
            <ActivityIndicator size="large" color="#56ccf2" style={{ marginTop: 60 }} />
          ) : error ? (
            <Text style={styles.errorTxt}>{error}</Text>
          ) : homeData ? (
            <>
              {/* ── CURRENT WEATHER ── */}
              <FadeSlide delay={200}>
                <View style={styles.glassCard}>
                  <Text style={styles.cardLabel}>Current Weather</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.tempBig}>{Math.round(temp as number)}°C</Text>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricIcon}>💨</Text>
                        <Text style={styles.metricTxt}>Wind: {wind} m/s</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricIcon}>💧</Text>
                        <Text style={styles.metricTxt}>Humidity: {humidity}%</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 68 }}>{wIcon}</Text>
                  </View>
                </View>
              </FadeSlide>

              {/* ── AQI + UV ── */}
              <FadeSlide delay={280}>
                <View style={styles.dualRow}>
                  <View style={[styles.glassCardSm, { backgroundColor: aqiBg(aqiVal) }]}>
                    <Text style={{ fontSize: 28 }}>🧑</Text>
                    <Text style={styles.smLabel}>AQI</Text>
                    <Text style={styles.smValue}>{aqiVal}</Text>
                  </View>
                  <View style={[styles.glassCardSm, { backgroundColor: 'rgba(255,200,50,0.16)' }]}>
                    <Text style={{ fontSize: 28 }}>☀️</Text>
                    <Text style={styles.smLabel}>UV Index</Text>
                    <Text style={styles.smValue}>{uvVal}</Text>
                  </View>
                </View>
              </FadeSlide>

              {/* ── RAIN CURVE ── */}
              <FadeSlide delay={360}>
                <View style={styles.glassCard}>
                  <Text style={styles.cardLabel}>Rain Probability Timeline</Text>
                  <RainCurve rainProb={rainProb as number} />
                </View>
              </FadeSlide>

              {/* ── PERSONA WIDGETS ── */}
              {homeData?.widgets
                ?.filter((w: any) => !['current_weather', 'aqi', 'uv', 'rain_forecast', 'rain_probability'].includes(w.type))
                .map((widget: any, i: number) => {
                  if (widget.type === 'route_weather') {
                    return (
                      <FadeSlide key={widget.type + i} delay={440 + i * 70}>
                        <View style={styles.glassCard}>
                          <Text style={styles.cardLabel}>{widget.title}</Text>
                          {widget.data.message ? (
                            <Text style={styles.metricTxt}>{widget.data.message}</Text>
                          ) : (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              {[
                                { label: 'Start',    d: widget.data.origin },
                                { label: 'En Route', d: widget.data.midpoint },
                                { label: 'End',      d: widget.data.destination },
                              ].map((leg, li) => (
                                <View key={li} style={{ alignItems: 'center', flex: 1 }}>
                                  <Text style={styles.routeLegLabel}>{leg.label}</Text>
                                  <Text style={{ fontSize: 32 }}>{WEATHER_ICONS[leg.d?.condition] || '🌤️'}</Text>
                                  <Text style={styles.routeTemp}>{leg.d?.temp}°C</Text>
                                  {li < 2 && <Text style={styles.arrow}>→</Text>}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </FadeSlide>
                    );
                  }
                  return (
                    <FadeSlide key={widget.type + i} delay={440 + i * 70}>
                      <View style={styles.glassCard}>
                        <Text style={styles.cardLabel}>{widget.title}</Text>
                        {Object.entries(widget.data).map(([k, v]) => (
                          <View key={k} style={styles.metricRow}>
                            <Text style={styles.widgetKey}>{k.replace(/_/g, ' ')}: </Text>
                            <Text style={styles.metricTxt}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                          </View>
                        ))}
                      </View>
                    </FadeSlide>
                  );
                })}

              <View style={{ height: 110 }} />
            </>
          ) : null}
            </>
          )}
        </ScrollView>

        {/* ── BOTTOM NAV ── */}
        <View style={styles.bottomNav}>
          {[{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }, { id: 'maps', icon: '🗺️', label: 'Maps' }].map(tab => (
            <TouchableOpacity key={tab.id} style={styles.navTab} onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.navIcon, activeTab === tab.id && styles.navIconActive]}>{tab.icon}</Text>
              <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Central FAB — AI Globe */}
          <TouchableOpacity style={styles.fabWrap} onPress={() => setTriggerAlert(v => !v)}>
            <LinearGradient colors={['#56ccf2', '#2f80ed']} style={styles.fab}>
              <Text style={styles.fabIcon}>🌐</Text>
            </LinearGradient>
          </TouchableOpacity>

          {[{ id: 'alerts', icon: '🔔', label: 'Alerts' }, { id: 'settings', icon: '⚙️', label: 'Settings' }].map(tab => (
            <TouchableOpacity key={tab.id} style={styles.navTab} onPress={() => { if (tab.id === 'settings') setIsOnboarding(true); else setActiveTab(tab.id); }}>
              <Text style={[styles.navIcon, activeTab === tab.id && styles.navIconActive]}>{tab.icon}</Text>
              <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const G = {
  backgroundColor: 'rgba(255,255,255,0.07)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  borderRadius: 20,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Onboarding
  obScroll:      { flexGrow: 1, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 36 },
  obHeader:      { alignItems: 'center', marginBottom: 32 },
  emblemLarge:   { fontSize: 60, marginBottom: 8 },
  obTitle:       { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  obIMD:         { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginTop: 4, textAlign: 'center' },
  obWelcome:     { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 22, textAlign: 'center' },
  obChip:        { alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minWidth: 70 },
  obChipActive:  { backgroundColor: 'rgba(86,204,242,0.2)', borderColor: 'rgba(86,204,242,0.5)' },
  obChipLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  obChipLabelActive: { color: '#56ccf2' },

  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emblemMd:     { fontSize: 46 },
  appTitle:     { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  imdText:      { fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, marginTop: 2 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  // Glass card
  glassCard: { ...G, padding: 16, marginBottom: 12 },
  cardLabel:  { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  // Inputs
  inputLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: '600' },
  input:        { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', marginBottom: 16 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  detectBtn:    { backgroundColor: 'rgba(86,204,242,0.25)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(86,204,242,0.35)' },
  startBtn:     { backgroundColor: 'rgba(86,204,242,0.25)', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 22, borderWidth: 1, borderColor: 'rgba(86,204,242,0.45)' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  destInput:    { fontSize: 15, color: '#fff', paddingVertical: 14 },

  // Location bar
  locationBar:   { ...G, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, marginBottom: 8 },
  locName:       { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  dots:          { flexDirection: 'row', gap: 4, marginLeft: 8 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive:     { width: 16, backgroundColor: '#56ccf2', borderRadius: 3 },
  savedBtn:      { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  savedBtnTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  savedRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  savedLocName:  { fontSize: 15, fontWeight: '600', color: '#fff' },
  savedLocDetail:{ fontSize: 13, color: 'rgba(255,255,255,0.55)' },

  // Persona chips (main)
  pIconCircle:        { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pIconCircleActive:  { backgroundColor: 'rgba(86,204,242,0.2)', borderColor: 'rgba(86,204,242,0.45)' },
  pLabel:             { fontSize: 10, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  pLabelActive:       { color: '#56ccf2', fontWeight: '600' },

  // Alerts
  severeAlert: { backgroundColor: 'rgba(239,68,68,0.18)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', borderRadius: 16, padding: 14, marginBottom: 12 },
  severeTitle: { fontSize: 13, fontWeight: '800', color: '#fca5a5', marginBottom: 4 },
  severeMsg:   { fontSize: 13, color: '#fca5a5' },

  // Weather
  tempBig:    { fontSize: 60, fontWeight: '800', color: '#fff', lineHeight: 68 },
  metricRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  metricIcon: { fontSize: 14 },
  metricTxt:  { fontSize: 14, color: 'rgba(255,255,255,0.68)' },

  // Rain curve
  curveAxisLabel: { fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 0 },

  // Dual row
  dualRow:     { flexDirection: 'row', gap: 12, marginBottom: 12 },
  glassCardSm: { flex: 1, ...G, padding: 16, alignItems: 'center', borderRadius: 20 },
  smLabel:     { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  smValue:     { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 2 },

  // Widget
  widgetKey:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  routeLegLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  routeTemp:   { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 4 },
  arrow:       { fontSize: 18, color: 'rgba(255,255,255,0.3)', position: 'absolute', right: -8, top: 28 },

  // Error
  errorTxt: { color: '#fca5a5', textAlign: 'center', fontSize: 15, marginTop: 40 },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 8,
    backgroundColor: 'rgba(10,20,50,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  navTab:         { alignItems: 'center', flex: 1, paddingVertical: 4 },
  navIcon:        { fontSize: 22, opacity: 0.35 },
  navIconActive:  { opacity: 1 },
  navLabel:       { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  navLabelActive: { color: '#56ccf2', fontWeight: '700', opacity: 1 },

  // FAB
  fabWrap: { width: 60, height: 60, borderRadius: 30, marginBottom: 12, shadowColor: '#56ccf2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 14, elevation: 14 },
  fab:     { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { fontSize: 26 },
});
