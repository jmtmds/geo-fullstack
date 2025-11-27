import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Alert, SafeAreaView, StatusBar, Platform, Image, Linking } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
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
  
  // Form States
  const [idToEdit, setIdToEdit] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // --- 1. Permissões e Carregamento Inicial ---
  useEffect(() => {
    (async () => {
      // Pedir permissão de GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Precisamos da permissão de localização!');
        return;
      }
      // Pegar localização atual
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      // Pedir permissão de Câmera (Opcional, mas bom garantir)
      await ImagePicker.requestCameraPermissionsAsync();
      
      fetchPlaces();
    })();
  }, []);

  // --- 2. Funções de API ---
  const fetchPlaces = async () => {
    try {
      const response = await axios.get(API_URL);
      setPlaces(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) return Alert.alert("Preencha os campos!");
    if (!location) return Alert.alert("Aguardando GPS...");

    const payload = {
      title,
      description,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      photo
    };

    try {
      if (idToEdit) {
        // Editando (PUT)
        await axios.put(`${API_URL}/${idToEdit}`, payload);
        Alert.alert("Sucesso", "Local atualizado!");
      } else {
        // Criando (POST)
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

  // --- 3. Funcionalidades Extras ---
  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Qualidade reduzida para não pesar no banco (base64)
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const startEdit = (item: Place) => {
    setIdToEdit(item._id);
    setTitle(item.title);
    setDescription(item.description);
    setPhoto(item.photo || null);
    // Mantemos a localização atual do GPS para atualizar, ou poderíamos usar a do item
  };

  const resetForm = () => {
    setIdToEdit(null);
    setTitle('');
    setDescription('');
    setPhoto(null);
  };

  const openMap = (lat: number, long: number) => {
    const url = Platform.OS === 'ios' 
      ? `maps:0,0?q=${lat},${long}` 
      : `geo:0,0?q=${lat},${long}(Local)`;
    Linking.openURL(url);
  };

  // --- 4. Renderização ---
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
        
        <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(item.latitude, item.longitude)}>
          <Feather name="map-pin" size={14} color="#FFF" />
          <Text style={styles.mapBtnText}> Ver no Mapa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.headerTitle}>📸 Geo Diário</Text>

      <View style={styles.form}>
        <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.previewImage} />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Feather name="camera" size={24} color="#666" />
              <Text style={{color: '#666'}}>Tirar Foto</Text>
            </View>
          )}
        </TouchableOpacity>

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
        
        {location && <Text style={styles.gpsText}>📍 GPS Ativo: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}</Text>}
      </View>

      <FlatList data={places} keyExtractor={i => i._id} renderItem={renderItem} contentContainerStyle={styles.list} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#111827' },
  form: { backgroundColor: '#FFF', padding: 20, margin: 16, borderRadius: 16, elevation: 4 },
  
  cameraBtn: { alignSelf: 'center', marginBottom: 15 },
  cameraPlaceholder: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: 100, height: 100, borderRadius: 10 },
  
  input: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  
  rowBtn: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  saveBtn: { backgroundColor: '#4F46E5' },
  cancelBtn: { backgroundColor: '#6B7280' },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  gpsText: { textAlign: 'center', marginTop: 10, color: '#10B981', fontSize: 12 },

  list: { paddingHorizontal: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 2 },
  cardImage: { width: '100%', height: 150 },
  cardContent: { padding: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  desc: { color: '#6B7280', marginVertical: 5 },
  
  mapBtn: { flexDirection: 'row', backgroundColor: '#059669', padding: 8, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8, alignItems: 'center' },
  mapBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});