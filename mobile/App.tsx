import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  Alert, SafeAreaView, StatusBar, Platform, Image, Keyboard, Modal, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { API_URL } from './api-config';

// --- CORES & TEMA ---
const COLORS = {
  primary: '#2563EB',    // Azul Royal Moderno
  secondary: '#10B981',  // Verde Sucesso
  danger: '#EF4444',     // Vermelho Alerta
  background: '#F8FAFC', // Cinza muito claro (quase branco)
  card: '#FFFFFF',
  text: '#1E293B',       // Cinza Escuro (Slate)
  textLight: '#64748B',  // Cinza Médio
  border: '#E2E8F0'
};

interface Place {
  _id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photo?: string | null;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [idToEdit, setIdToEdit] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  // Mapa Geral
  const [isMapVisible, setIsMapVisible] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'O app precisa do GPS para funcionar corretamente.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      fetchPlaces();
    })();
  }, []);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      setPlaces(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    if (!title.trim() || !description.trim()) return Alert.alert("Atenção", "Preencha o nome e a descrição.");
    
    // Pega GPS atual ou mantém 0 se não tiver (ideal seria travar salvar sem gps)
    const currentLat = location?.coords.latitude || 0;
    const currentLong = location?.coords.longitude || 0;

    const payload = {
      title,
      description,
      latitude: currentLat, 
      longitude: currentLong,
      photo
    };

    try {
      if (idToEdit) {
        await axios.put(`${API_URL}/${idToEdit}`, payload);
        Alert.alert("Sucesso", "Registro atualizado!");
      } else {
        await axios.post(API_URL, payload);
        Alert.alert("Sucesso", "Novo local registrado!");
      }
      resetForm();
      fetchPlaces();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar.");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Excluir",
      "Tem certeza que deseja apagar este registro?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Apagar", 
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/${id}`);
              fetchPlaces();
            } catch (error) {
              Alert.alert("Erro", "Falha ao deletar.");
            }
          }
        }
      ]
    );
  };

  const handleImage = async (fromGallery: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    };

    let result;
    if (fromGallery) {
      result = await ImagePicker.launchImageLibraryAsync(options);
    } else {
      result = await ImagePicker.launchCameraAsync(options);
    }

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const startEdit = (item: Place) => {
    setIdToEdit(item._id);
    setTitle(item.title);
    setDescription(item.description);
    setPhoto(item.photo || null);
  };

  const resetForm = () => {
    setIdToEdit(null);
    setTitle('');
    setDescription('');
    setPhoto(null);
    Keyboard.dismiss();
  };

  const renderItem = ({ item }: { item: Place }) => (
    <View style={styles.card}>
      {item.photo && <Image source={{ uri: item.photo }} style={styles.cardImage} />}
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionIcon}>
              <Feather name="edit-2" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionIcon}>
              <Feather name="trash-2" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.locationBadge}>
          <Feather name="map-pin" size={12} color={COLORS.textLight} />
          <Text style={styles.locationText}>
            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GeoTrip Journal 🌍</Text>
          <Text style={styles.headerSubtitle}>Registre suas aventuras</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsMapVisible(true)} 
          style={styles.mapButton}
          activeOpacity={0.8}
        >
          <Feather name="map" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList 
        data={places} 
        keyExtractor={i => i._id} 
        renderItem={renderItem} 
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          /* FORMULÁRIO COMO CABEÇALHO DA LISTA (SCROLLA JUNTO) */
          <View style={styles.formCard}>
            
            <View style={styles.photoButtonsContainer}>
              <TouchableOpacity style={[styles.photoBtn, { backgroundColor: COLORS.primary }]} onPress={() => handleImage(false)}>
                <Feather name="camera" size={20} color="#FFF" />
                <Text style={styles.photoBtnText}>Câmera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.photoBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => handleImage(true)}>
                <Feather name="image" size={20} color="#FFF" />
                <Text style={styles.photoBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>

            {photo && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: photo }} style={styles.previewThumb} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto(null)}>
                  <Feather name="x" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            <TextInput 
              style={styles.input} 
              placeholder="Nome do Local (ex: Praia dos Carneiros)" 
              placeholderTextColor="#94A3B8"
              value={title} 
              onChangeText={setTitle} 
            />
            
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="O que tornou esse lugar especial?" 
              placeholderTextColor="#94A3B8"
              value={description} 
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.formActions}>
              {idToEdit && (
                <TouchableOpacity style={[styles.mainButton, styles.cancelButton]} onPress={resetForm}>
                  <Text style={[styles.mainButtonText, { color: COLORS.text }]}>Cancelar</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: idToEdit ? COLORS.primary : COLORS.secondary }]} 
                onPress={handleSave}
              >
                <Feather name={idToEdit ? "refresh-cw" : "save"} size={20} color="#FFF" style={{marginRight: 8}} />
                <Text style={styles.mainButtonText}>{idToEdit ? 'Atualizar Registro' : 'Salvar Local'}</Text>
              </TouchableOpacity>
            </View>

            {location && (
              <View style={styles.gpsContainer}>
                <View style={styles.gpsDot} />
                <Text style={styles.gpsText}>GPS Ativo e Preciso</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Feather name="navigation" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhum local salvo ainda.</Text>
              <Text style={styles.emptySubText}>Use o formulário acima para começar!</Text>
            </View>
          ) : <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        }
      />

      {/* --- MODAL DO MAPA (Tela Cheia com Botão Corrigido) --- */}
      <Modal visible={isMapVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView 
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: location ? location.coords.latitude : -8.05,
              longitude: location ? location.coords.longitude : -34.9,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {places.map((place) => (
              <Marker
                key={place._id}
                coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                title={place.title}
                description={place.description}
                pinColor={COLORS.primary}
              />
            ))}
          </MapView>

          {/* Botão de Fechar com SafeArea para não ficar embaixo da status bar */}
          <SafeAreaView style={styles.mapCloseContainer}>
            <TouchableOpacity onPress={() => setIsMapVisible(false)} style={styles.mapCloseBtn}>
              <Feather name="arrow-left" size={24} color="#333" />
              <Text style={styles.mapCloseText}>Voltar</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // HEADER
  header: { 
    paddingHorizontal: 24, paddingVertical: 20, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.background
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: -4 },
  mapButton: { 
    backgroundColor: COLORS.primary, width: 48, height: 48, borderRadius: 24, 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },

  list: { paddingHorizontal: 20, paddingBottom: 40 },

  // FORMULÁRIO
  formCard: { 
    backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3
  },
  photoButtonsContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoBtn: { 
    flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', gap: 8 
  },
  photoBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  
  previewContainer: { marginBottom: 16, position: 'relative' },
  previewThumb: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#F1F5F9' },
  removePhotoBtn: { 
    position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', 
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' 
  },

  input: { 
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: 12 
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  formActions: { flexDirection: 'row', gap: 12 },
  mainButton: { 
    flex: 1, flexDirection: 'row', height: 56, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  cancelButton: { backgroundColor: COLORS.border, elevation: 0 },
  mainButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  gpsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 6 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  gpsText: { color: COLORS.secondary, fontSize: 12, fontWeight: '600' },

  // CARTÕES DA LISTA
  card: { 
    backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: COLORS.border
  },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 10 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionIcon: { padding: 4 },
  desc: { color: COLORS.textLight, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  
  locationBadge: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', 
    backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 
  },
  locationText: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },

  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.6 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptySubText: { fontSize: 14, color: COLORS.textLight },

  // MAPA (Modal)
  mapCloseContainer: { position: 'absolute', top: 40, left: 20 },
  mapCloseBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5
  },
  mapCloseText: { marginLeft: 8, fontWeight: '600', color: '#333' }
});