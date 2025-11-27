import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  Alert, SafeAreaView, StatusBar, Platform, Image, Keyboard, Modal 
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'; // Import do Mapa
import { Feather } from '@expo/vector-icons';
import { API_URL } from './api-config';

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
  
  // Estados do Formulário
  const [idToEdit, setIdToEdit] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  // Estado do Mapa Geral
  const [isMapVisible, setIsMapVisible] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Precisamos da permissão de localização!');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync(); // Permissão da Galeria
      
      fetchPlaces();
    })();
  }, []);

  const fetchPlaces = async () => {
    try {
      const response = await axios.get(API_URL);
      setPlaces(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss(); // <--- FECHA O TECLADO AQUI

    if (!title.trim() || !description.trim()) return Alert.alert("Preencha os campos!");
    // Se estiver editando, usa a localização original do item, senão usa o GPS atual
    if (!idToEdit && !location) return Alert.alert("Aguardando GPS...");

    // Se for novo, usa GPS atual. Se for edição, vamos manter a lógica simples (atualiza dados, mantem lat/long ou atualiza se quiser)
    // Aqui vou usar o GPS atual para novos, e manter a lógica simples.
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
        Alert.alert("Sucesso", "Local atualizado!");
      } else {
        await axios.post(API_URL, payload);
        Alert.alert("Sucesso", "Local salvo!");
      }
      resetForm();
      fetchPlaces();
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchPlaces();
    } catch (error) {
      Alert.alert("Erro", "Falha ao deletar.");
    }
  };

  // --- Funções de Imagem ---
  const handleImage = async (fromGallery: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'], // Atualizado para nova sintaxe
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
        <View style={styles.row}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => startEdit(item)}><Feather name="edit" size={20} color="#4F46E5" /></TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)}><Feather name="trash-2" size={20} color="#EF4444" /></TouchableOpacity>
          </View>
        </View>
        <Text style={styles.desc}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📸 Geo Diário</Text>
        {/* Botão para abrir o Mapa Geral */}
        <TouchableOpacity onPress={() => setIsMapVisible(true)} style={styles.headerMapBtn}>
          <Feather name="map" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.photoButtonsContainer}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => handleImage(false)}>
            <Feather name="camera" size={20} color="#FFF" />
            <Text style={styles.photoBtnText}>Câmera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.photoBtn, styles.galleryBtn]} onPress={() => handleImage(true)}>
            <Feather name="image" size={20} color="#FFF" />
            <Text style={styles.photoBtnText}>Galeria</Text>
          </TouchableOpacity>
        </View>

        {photo && <Image source={{ uri: photo }} style={styles.previewThumb} />}

        <TextInput style={styles.input} placeholder="Nome do Local" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Descrição" value={description} onChangeText={setDescription} />
        
        <View style={styles.rowBtn}>
          {idToEdit && (
            <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={resetForm}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.button, styles.saveBtn]} onPress={handleSave}>
            <Text style={styles.buttonText}>{idToEdit ? 'Atualizar' : 'Salvar Local'}</Text>
          </TouchableOpacity>
        </View>
        
        {location && <Text style={styles.gpsText}>📍 GPS: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}</Text>}
      </View>

      <FlatList 
        data={places} 
        keyExtractor={i => i._id} 
        renderItem={renderItem} 
        contentContainerStyle={styles.list} 
      />

      {/* --- MODAL DO MAPA --- */}
      <Modal visible={isMapVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mapa de Viagens 🌎</Text>
            <TouchableOpacity onPress={() => setIsMapVisible(false)}>
              <Feather name="x" size={28} color="#333" />
            </TouchableOpacity>
          </View>
          
          <MapView 
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE} // Remove se der erro no iOS, mas bom para Android
            initialRegion={{
              latitude: location ? location.coords.latitude : -8.05,
              longitude: location ? location.coords.longitude : -34.9,
              latitudeDelta: 0.05, // Zoom
              longitudeDelta: 0.05,
            }}
          >
            {/* Renderiza um marcador para cada local salvo */}
            {places.map((place) => (
              <Marker
                key={place._id}
                coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                title={place.title}
                description={place.description}
              />
            ))}
          </MapView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  
  header: { 
    padding: 20, backgroundColor: '#fff', flexDirection: 'row', 
    justifyContent: 'space-between', alignItems: 'center', elevation: 2 
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  headerMapBtn: { padding: 5 },

  form: { backgroundColor: '#FFF', padding: 20, margin: 16, borderRadius: 16, elevation: 4 },
  
  photoButtonsContainer: { flexDirection: 'row', gap: 10, marginBottom: 15, justifyContent: 'center' },
  photoBtn: { 
    flexDirection: 'row', backgroundColor: '#3B82F6', padding: 10, borderRadius: 8, 
    alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' 
  },
  galleryBtn: { backgroundColor: '#8B5CF6' }, // Roxo para galeria
  photoBtnText: { color: '#FFF', fontWeight: 'bold' },

  previewThumb: { width: '100%', height: 150, borderRadius: 8, marginBottom: 15 },
  
  input: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  
  rowBtn: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  saveBtn: { backgroundColor: '#10B981' }, // Verde para salvar
  cancelBtn: { backgroundColor: '#6B7280' },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  gpsText: { textAlign: 'center', marginTop: 10, color: '#6B7280', fontSize: 12 },

  list: { paddingHorizontal: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 2 },
  cardImage: { width: '100%', height: 150 },
  cardContent: { padding: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  desc: { color: '#6B7280', marginTop: 5 },

  // Estilos do Modal
  modalHeader: { 
    padding: 20, backgroundColor: '#FFF', flexDirection: 'row', 
    justifyContent: 'space-between', alignItems: 'center', elevation: 4, zIndex: 1 
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' }
});