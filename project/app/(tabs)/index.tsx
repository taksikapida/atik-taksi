import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  Linking,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

// Types
interface Driver {
  id: number;
  name: string;
  phone: string;
  plate: string;
  depot: string;
  photo: string;
  debt: number;
  online: boolean;
  lastLocation: string;
  locationLink: string;
}

interface Booking {
  id: number;
  customerName: string;
  customerPhone: string;
  pickup: string;
  drop: string;
  date: string;
  time: string;
  notes: string;
  locationLink?: string;
  isNew: boolean;
  urgentNotified: boolean;
  driverId?: number;
  driverName?: string;
  driverPhone?: string;
  driverPlate?: string;
}

interface HistoryRecord {
  customerName: string;
  customerPhone: string;
  lastBooking: string;
  driverName: string;
  driverPlate: string;
  location: string;
  locationLink: string;
}

// Sample data
const initialDrivers: Driver[] = [
  {
    id: 1,
    name: "Ahmet Yılmaz",
    phone: "5551234567",
    plate: "34 ABC 123",
    depot: "Merkez Durak",
    photo: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1",
    debt: 150,
    online: true,
    lastLocation: "Merkez, İstanbul",
    locationLink: "https://goo.gl/maps/XYZ123"
  },
  {
    id: 2,
    name: "Mehmet Demir",
    phone: "5557654321",
    plate: "34 XYZ 456",
    depot: "Şehir Durak",
    photo: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1",
    debt: -40,
    online: false,
    lastLocation: "Havalimanı, İstanbul",
    locationLink: "https://goo.gl/maps/ABC456"
  }
];

export default function AtikTaksiApp() {
  // Screen states
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [adminTab, setAdminTab] = useState('bookings');
  
  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Booking form states
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // Driver form states
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPlate, setDriverPlate] = useState('');
  const [driverDepot, setDriverDepot] = useState('');
  const [driverDebt, setDriverDebt] = useState('0');
  const [driverPhoto, setDriverPhoto] = useState('https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1');
  
  // Data states
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [taxiIdCounter, setTaxiIdCounter] = useState(1);
  
  // Menu and notification states
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [newBookingAnimation] = useState(new Animated.Value(0));
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Location loading state
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Confirmation data
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    // Set current date and time
    const now = new Date();
    setBookingDate(now.toISOString().split('T')[0]);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setBookingTime(`${hours}:${minutes}`);
  }, []);

  // Load notification sound
  useEffect(() => {
    loadNotificationSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Check for new bookings and animate
  useEffect(() => {
    const newBookings = bookings.filter(booking => booking.isNew);
    if (newBookings.length > 0 && currentScreen === 'admin') {
      playNotificationSound();
      animateNewBooking();
      // Mark as seen after animation
      setTimeout(() => {
        setBookings(prev => prev.map(b => ({ ...b, isNew: false })));
      }, 3000);
    }
  }, [bookings, currentScreen]);

  const loadNotificationSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { shouldPlay: false }
      );
      setSound(newSound);
    } catch (error) {
      console.log('Ses yüklenemedi:', error);
    }
  };

  const playNotificationSound = async () => {
    try {
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.log('Ses çalınamadı:', error);
    }
  };

  const animateNewBooking = () => {
    Animated.sequence([
      Animated.timing(newBookingAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(newBookingAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  };
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const showNotification = (message: string) => {
    triggerHaptic();
    Alert.alert('Bildirim', message);
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        showNotification('Konum izni verilmedi!');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      
      setPickup(`Konum: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${mapsLink})`);
      showNotification('Konumunuz alındı!');
      
    } catch (error) {
      showNotification('Konum alınamadı!');
    } finally {
      setLocationLoading(false);
    }
  };

  const openWhatsApp = (phone: string, message: string) => {
    const whatsappUrl = `https://wa.me/+90${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl);
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('-').reverse().join('.');
  };

  const formatMoney = (amount: number) => {
    return `${amount} TL`;
  };

  const handleLogin = () => {
    if (!customerName || !customerPhone) {
      showNotification('Lütfen adınızı ve telefon numaranızı girin!');
      return;
    }
    setCurrentScreen('booking');
  };

  const handleAdminLogin = () => {
    if (adminUsername === 'atik' && adminPassword === '1234') {
      setCurrentScreen('admin');
      setAdminUsername('');
      setAdminPassword('');
    } else {
      showNotification('Geçersiz kullanıcı adı veya şifre!');
    }
  };

  const handleBookingConfirm = () => {
    if (!pickup || !drop || !bookingDate || !bookingTime) {
      showNotification('Lütfen tüm gerekli alanları doldurun!');
      return;
    }

    const newBooking: Booking = {
      id: taxiIdCounter,
      customerName,
      customerPhone,
      pickup,
      drop,
      date: bookingDate,
      time: bookingTime,
      notes,
      locationLink: pickup.includes('https://') ? pickup.split('(')[1]?.replace(')', '') : undefined,
      isNew: true,
      urgentNotified: false,
    };

    setBookings(prev => [...prev, newBooking]);
    setTaxiIdCounter(prev => prev + 1);

    // Add to history
    const newHistoryRecord: HistoryRecord = {
      customerName,
      customerPhone,
      lastBooking: `${formatDate(bookingDate)} ${bookingTime}`,
      driverName: "Atanmadı",
      driverPlate: "-",
      location: pickup,
      locationLink: pickup.includes('https://') ? pickup.split('(')[1]?.replace(')', '') || "#" : "#"
    };

    setHistory(prev => [newHistoryRecord, ...prev]);
    setConfirmedBooking(newBooking);
    setCurrentScreen('confirmation');

    // Trigger notification animation for admin panel
    triggerHaptic();

    // Clear form
    setPickup('');
    setDrop('');
    setNotes('');
  };

  const assignDriver = (bookingId: number, driverId: number) => {
    const booking = bookings.find(b => b.id === bookingId);
    const driver = drivers.find(d => d.id === driverId);
    
    if (!booking || !driver) return;

    const updatedBooking = {
      ...booking,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverPlate: driver.plate,
    };

    setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));

    // Send detailed WhatsApp message to driver
    const locationText = booking.locationLink ? 
      `Konum Linki: ${booking.locationLink}` : 
      'Konum: Manuel olarak girildi';
    
    const message = `🚖 ATİK TAKSİ - YENİ REZERVASYON 🚖

Merhaba ${driver.name},

📋 REZERVASYON BİLGİLERİ:
👤 Müşteri: ${booking.customerName}
📞 Telefon: ${booking.customerPhone}
📍 Alınacak Yer: ${booking.pickup}
🗺️ ${locationText}
🏁 Bırakılacak Yer: ${booking.drop}
📅 Tarih: ${formatDate(booking.date)}
⏰ Saat: ${booking.time}
📝 Notlar: ${booking.notes || 'Özel not yok'}

⚠️ ÖNEMLİ: Lütfen müşteriyi HEMEN arayarak bilgi verin ve konumunu doğrulayın.

İyi yolculuklar! 🚗💨`;
    
    openWhatsApp(driver.phone, message);
    showNotification(`${driver.name} şoförüne atandı!`);
  };

  const removeDriverAssignment = (bookingId: number) => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId 
        ? { ...b, driverId: undefined, driverName: undefined, driverPhone: undefined, driverPlate: undefined }
        : b
    ));
    showNotification('Şoför ataması kaldırıldı!');
  };

  const deleteBooking = (bookingId: number) => {
    Alert.alert(
      'Rezervasyon Sil',
      'Bu rezervasyonu silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => {
            setBookings(prev => prev.filter(b => b.id !== bookingId));
            showNotification('Rezervasyon silindi!');
          }
        }
      ]
    );
  };

  const deleteDriver = (driverId: number) => {
    Alert.alert(
      'Şoför Sil',
      'Bu şoförü silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => {
            setDrivers(prev => prev.filter(d => d.id !== driverId));
            showNotification('Şoför silindi!');
          }
        }
      ]
    );
  };

  const addNewDriver = () => {
    if (!driverName || !driverPhone || !driverPlate || !driverDepot) {
      showNotification('Lütfen tüm alanları doldurun!');
      return;
    }

    const newDriver: Driver = {
      id: drivers.length > 0 ? Math.max(...drivers.map(d => d.id)) + 1 : 1,
      name: driverName,
      phone: driverPhone,
      plate: driverPlate,
      depot: driverDepot,
      photo: driverPhoto,
      debt: parseInt(driverDebt) || 0,
      online: false,
      lastLocation: "",
      locationLink: ""
    };

    setDrivers(prev => [...prev, newDriver]);
    showNotification('Yeni şoför eklendi!');

    // Clear form
    setDriverName('');
    setDriverPhone('');
    setDriverPlate('');
    setDriverDepot('');
    setDriverDebt('0');
    setDriverPhoto('https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setDriverPhoto(result.assets[0].uri);
    }
  };

  const showDriverAssignModal = (bookingId: number) => {
    if (drivers.length === 0) {
      showNotification('Henüz kayıtlı şoför yok!');
      return;
    }

    // İlk kayıtlı şoföre direkt ata
    const firstDriver = drivers[0];
    assignDriver(bookingId, firstDriver.id);
  };

  // Render intro screen
  const renderIntroScreen = () => (
    <LinearGradient colors={['#1a2a6c', '#b21f1f']} style={styles.container}>
      {/* Hamburger Menu Button */}
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={() => setShowHamburgerMenu(true)}
      >
        <Ionicons name="menu" size={24} color="#ffcc00" />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <LinearGradient colors={['#ffcc00', '#ff6600']} style={styles.logo}>
          <Ionicons name="car" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.appName}>ATİK TAKSİ</Text>
        <Text style={styles.welcomeMessage}>
          Atik Taksi ile hızlı, güvenli ve konforlu yolculuklar sizi bekliyor! 
          Şehirde bir yerden bir yere gitmek artık çok kolay. Hemen rezervasyon yapın, yolun keyfini çıkarın!
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setCurrentScreen('login')}
        >
          <Text style={styles.primaryButtonText}>Hadi Gidelim</Text>
        </TouchableOpacity>
      </View>

      {/* Hamburger Menu Modal */}
      {showHamburgerMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={styles.menuBackdrop}
            onPress={() => setShowHamburgerMenu(false)}
          />
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowHamburgerMenu(false);
                setCurrentScreen('adminLogin');
              }}
            >
              <Ionicons name="settings" size={20} color="#ffcc00" />
              <Text style={styles.menuItemText}>Admin Girişi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowHamburgerMenu(false)}
            >
              <Ionicons name="close" size={20} color="#ffcc00" />
              <Text style={styles.menuItemText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );

  // Render login screen
  const renderLoginScreen = () => (
    <LinearGradient colors={['#1a2a6c', '#b21f1f']} style={styles.container}>
      {/* Hamburger Menu Button */}
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={() => setShowHamburgerMenu(true)}
      >
        <Ionicons name="menu" size={24} color="#ffcc00" />
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <Text style={styles.screenTitle}>ATİK TAKSİ REZERVASYON</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="person" size={16} color="#ffcc00" /> Müşteri Adı
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Tam adınızı girin"
            value={customerName}
            onChangeText={setCustomerName}
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="call" size={16} color="#ffcc00" /> Telefon Numarası
          </Text>
          <TextInput
            style={styles.input}
            placeholder="5__ ___ __ __"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
        </View>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>Rezervasyon Yap</Text>
        </TouchableOpacity>
      </View>

      {/* Hamburger Menu Modal */}
      {showHamburgerMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={styles.menuBackdrop}
            onPress={() => setShowHamburgerMenu(false)}
          />
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowHamburgerMenu(false);
                setCurrentScreen('adminLogin');
              }}
            >
              <Ionicons name="settings" size={20} color="#ffcc00" />
              <Text style={styles.menuItemText}>Admin Girişi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowHamburgerMenu(false)}
            >
              <Ionicons name="close" size={20} color="#ffcc00" />
              <Text style={styles.menuItemText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );

  // Render admin login screen
  const renderAdminLoginScreen = () => (
    <LinearGradient colors={['#1a2a6c', '#b21f1f']} style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.screenTitle}>ATİK TAKSİ ADMİN</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="shield-checkmark" size={16} color="#ffcc00" /> Kullanıcı Adı
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Admin kullanıcı adı"
            value={adminUsername}
            onChangeText={setAdminUsername}
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="key" size={16} color="#ffcc00" /> Şifre
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Admin şifresi"
            value={adminPassword}
            onChangeText={setAdminPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />
        </View>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentScreen('login')}
        >
          <Text style={styles.secondaryButtonText}>Geri</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleAdminLogin}>
          <Text style={styles.primaryButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // Render booking screen
  const renderBookingScreen = () => (
    <LinearGradient colors={['#1a2a6c', '#b21f1f']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={styles.screenTitle}>ATİK TAKSİ REZERVASYON</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="location" size={16} color="#ffcc00" /> Alınacak Konum
            </Text>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Konumunuzu almak için butona basın"
                value={pickup}
                onChangeText={setPickup}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={locationLoading}
              >
                <Ionicons 
                  name={locationLoading ? "refresh" : "location"} 
                  size={20} 
                  color="#000" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="flag" size={16} color="#ffcc00" /> Bırakılacak Konum
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Varış adresini girin"
              value={drop}
              onChangeText={setDrop}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.dateTimeContainer}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                <Ionicons name="calendar" size={16} color="#ffcc00" /> Tarih
              </Text>
              <TextInput
                style={styles.input}
                value={bookingDate}
                onChangeText={setBookingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                <Ionicons name="time" size={16} color="#ffcc00" /> Saat
              </Text>
              <TextInput
                style={styles.input}
                value={bookingTime}
                onChangeText={setBookingTime}
                placeholder="HH:MM"
                placeholderTextColor="#999"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="document-text" size={16} color="#ffcc00" /> Ek Notlar (Opsiyonel)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Eklemek istediğiniz notlar"
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor="#999"
            />
          </View>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('login')}
          >
            <Text style={styles.secondaryButtonText}>İptal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton} onPress={handleBookingConfirm}>
            <Text style={styles.primaryButtonText}>Rezervasyonu Onayla</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );

  // Render confirmation screen
  const renderConfirmationScreen = () => (
    <LinearGradient colors={['#1a2a6c', '#b21f1f']} style={styles.container}>
      <View style={styles.confirmationContainer}>
        <Text style={styles.confirmationTitle}>REZERVASYON ONAYLANDI!</Text>
        
        {confirmedBooking && (
          <View style={styles.confirmationDetails}>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Rezervasyon ID:</Text>
              <Text style={styles.confirmationValue}>ATIK-{confirmedBooking.id.toString().padStart(4, '0')}</Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Müşteri Adı:</Text>
              <Text style={styles.confirmationValue}>{confirmedBooking.customerName}</Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Telefon:</Text>
              <Text style={styles.confirmationValue}>{confirmedBooking.customerPhone}</Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Alınacak Yer:</Text>
              <Text style={styles.confirmationValue}>{confirmedBooking.pickup}</Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Bırakılacak Yer:</Text>
              <Text style={styles.confirmationValue}>{confirmedBooking.drop}</Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Tarih/Saat:</Text>
              <Text style={styles.confirmationValue}>{formatDate(confirmedBooking.date)} {confirmedBooking.time}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactText}>
            Rezervasyonunuz alınmıştır. Taksi şoförümüz sizi arayacaktır.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('tel:05402423434')}>
            <Text style={styles.phoneLink}>Acilen ulaşmak için: 0540 242 34 34</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setCurrentScreen('login');
            setCustomerName('');
            setCustomerPhone('');
          }}
        >
          <Text style={styles.primaryButtonText}>Yeni Rezervasyon Yap</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // Render admin panel
  const renderAdminPanel = () => (
    <LinearGradient colors={['#1a2a6c', '#b21f1f']} style={styles.container}>
      {/* New Booking Notification */}
      <Animated.View
        style={[
          styles.newBookingNotification,
          {
            opacity: newBookingAnimation,
            transform: [{
              translateY: newBookingAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
          },
        ]}
      >
        <Ionicons name="notifications" size={20} color="#fff" />
        <Text style={styles.notificationText}>Yeni rezervasyon geldi!</Text>
      </Animated.View>

      <View style={styles.adminHeader}>
        <Text style={styles.adminTitle}>ATİK TAKSİ YÖNETİM</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setCurrentScreen('login')}
        >
          <Text style={styles.secondaryButtonText}>Çıkış</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, styles.bookingTab, adminTab === 'bookings' && styles.activeTab]}
          onPress={() => setAdminTab('bookings')}
        >
          <Text style={styles.tabButtonText}>Rezervasyonlar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, styles.driverTab, adminTab === 'drivers' && styles.activeTab]}
          onPress={() => setAdminTab('drivers')}
        >
          <Text style={styles.tabButtonText}>Şoförler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, styles.historyTab, adminTab === 'history' && styles.activeTab]}
          onPress={() => setAdminTab('history')}
        >
          <Text style={styles.tabButtonText}>Müşteri Takip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, styles.addDriverTab, adminTab === 'addDriver' && styles.activeTab]}
          onPress={() => setAdminTab('addDriver')}
        >
          <Text style={styles.tabButtonText}>Şoför Ekle</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.tabContent}>
        {adminTab === 'bookings' && renderBookingsTab()}
        {adminTab === 'drivers' && renderDriversTab()}
        {adminTab === 'history' && renderHistoryTab()}
        {adminTab === 'addDriver' && renderAddDriverTab()}
      </ScrollView>
    </LinearGradient>
  );

  // Render bookings tab
  const renderBookingsTab = () => (
    <View style={styles.tableContainer}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Animated.View style={[
            styles.tableRow, 
            item.driverId && styles.assignedRow,
            item.isNew && styles.newBookingRow
          ]}>
            <Text style={styles.tableCell}>ATIK-{item.id}</Text>
            <Text style={styles.tableCell}>{item.customerName}</Text>
            <Text style={styles.tableCell}>{formatDate(item.date)} {item.time}</Text>
            <TouchableOpacity
              onPress={() => item.locationLink && Linking.openURL(item.locationLink)}
              disabled={!item.locationLink}
            >
              <Text style={[styles.tableCell, styles.linkText]}>
                {item.locationLink ? 'Konumu Gör' : 'Belirtilmemiş'}
              </Text>
            </TouchableOpacity>
            <View style={styles.actionButtons}>
              {item.driverId ? (
                <View style={styles.assignedActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => removeDriverAssignment(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Kaldır</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteBooking(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.assignButton]}
                  onPress={() => showDriverAssignModal(item.id)}
                >
                  <Text style={styles.actionButtonText}>Ata</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Henüz rezervasyon yok</Text>
        }
      />
    </View>
  );

  // Render drivers tab
  const renderDriversTab = () => (
    <View style={styles.tableContainer}>
      <FlatList
        data={drivers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.driverRow}>
            <Image source={{ uri: item.photo }} style={styles.driverPhoto} />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{item.name}</Text>
              <Text style={styles.driverDetail}>📞 {item.phone}</Text>
              <Text style={styles.driverDetail}>🚗 {item.plate}</Text>
              <Text style={styles.driverDetail}>📍 {item.depot}</Text>
              <Text style={[
                styles.driverDetail, 
                item.debt >= 0 ? styles.debtPositive : styles.debtNegative
              ]}>
                💰 {formatMoney(item.debt)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteDriver(item.id)}
            >
              <Text style={styles.actionButtonText}>Sil</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Henüz şoför yok</Text>
        }
      />
    </View>
  );

  // Render history tab
  const renderHistoryTab = () => (
    <View style={styles.tableContainer}>
      <FlatList
        data={history}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <Text style={styles.historyText}>{item.customerName}</Text>
            <Text style={styles.historyText}>{item.customerPhone}</Text>
            <Text style={styles.historyText}>{item.lastBooking}</Text>
            <Text style={styles.historyText}>{item.driverName}</Text>
            <Text style={styles.historyText}>{item.driverPlate}</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(item.locationLink)}
            >
              <Text style={[styles.historyText, styles.linkText]}>{item.location}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Henüz geçmiş kayıt yok</Text>
        }
      />
    </View>
  );

  // Render add driver tab
  const renderAddDriverTab = () => (
    <ScrollView style={styles.addDriverContainer}>
      <View style={styles.photoUpload}>
        <Image source={{ uri: driverPhoto }} style={styles.photoPreview} />
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadButtonText}>Fotoğraf Yükle</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="person" size={16} color="#ffcc00" /> Adı Soyadı
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Şoförün adı soyadı"
          value={driverName}
          onChangeText={setDriverName}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="call" size={16} color="#ffcc00" /> Telefon Numarası
        </Text>
        <TextInput
          style={styles.input}
          placeholder="5__ ___ __ __"
          value={driverPhone}
          onChangeText={setDriverPhone}
          keyboardType="phone-pad"
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="car" size={16} color="#ffcc00" /> Plaka
        </Text>
        <TextInput
          style={styles.input}
          placeholder="34 ABC 123"
          value={driverPlate}
          onChangeText={setDriverPlate}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="location" size={16} color="#ffcc00" /> Durak
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Bağlı olduğu durak"
          value={driverDepot}
          onChangeText={setDriverDepot}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="card" size={16} color="#ffcc00" /> Başlangıç Borç
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          value={driverDebt}
          onChangeText={setDriverDebt}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>
      
      <TouchableOpacity style={styles.primaryButton} onPress={addNewDriver}>
        <Text style={styles.primaryButtonText}>Şoför Ekle</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentScreen === 'intro' && renderIntroScreen()}
      {currentScreen === 'login' && renderLoginScreen()}
      {currentScreen === 'adminLogin' && renderAdminLoginScreen()}
      {currentScreen === 'booking' && renderBookingScreen()}
      {currentScreen === 'confirmation' && renderConfirmationScreen()}
      {currentScreen === 'admin' && renderAdminPanel()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffcc00',
    marginBottom: 20,
  },
  welcomeMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffcc00',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: '#ffcc00',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  locationInputContainer: {
    position: 'relative',
  },
  locationButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#ffcc00',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#ffcc00',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ffcc00',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#ffcc00',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffcc00',
    textAlign: 'center',
    marginBottom: 30,
  },
  confirmationDetails: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  confirmationLabel: {
    color: '#ffcc00',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  contactInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  contactText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  phoneLink: {
    color: '#ffcc00',
    fontSize: 16,
    fontWeight: '600',
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  adminTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffcc00',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#ffcc00',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingTab: {
    backgroundColor: '#4CAF50',
  },
  driverTab: {
    backgroundColor: '#f44336',
  },
  historyTab: {
    backgroundColor: '#2196F3',
  },
  addDriverTab: {
    backgroundColor: '#2196F3',
  },
  activeTab: {
    opacity: 0.7,
  },
  tabContent: {
    flex: 1,
  },
  tableContainer: {
    flex: 1,
  },
  tableRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  assignedRow: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  tableCell: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  linkText: {
    color: '#ffcc00',
  },
  actionButtons: {
    marginTop: 10,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: '#4CAF50',
  },
  removeButton: {
    backgroundColor: '#f44336',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  driverRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  driverDetail: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 2,
  },
  debtPositive: {
    color: '#4CAF50',
  },
  debtNegative: {
    color: '#f44336',
  },
  historyRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  historyText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  addDriverContainer: {
    padding: 20,
  },
  photoUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
  uploadButton: {
    backgroundColor: 'rgba(255, 204, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#ffcc00',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  uploadButtonText: {
    color: '#ffcc00',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
  },
  hamburgerButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 90,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    padding: 10,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#ffcc00',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  menuItemText: {
    color: '#ffcc00',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '600',
  },
  newBookingNotification: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  notificationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  newBookingRow: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  assignedActions: {
    flexDirection: 'row',
    gap: 10,
  },
});