import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Alert, SafeAreaView, StatusBar, Platform } from 'react-native';
import axios from 'axios';
// Importamos a URL do arquivo secreto
import { API_URL } from './api-config'; 

interface Place {
  _id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Função para buscar locais do backend
  const fetchPlaces = async () => {
    try {
      const response = await axios.get(API_URL);
      setPlaces(response.data);
    } catch (error) {
      console.error("Erro ao buscar locais:", error);
      Alert.alert("Erro", "Não foi possível conectar ao backend.\nVerifique se o IP está correto em api-config.ts");
    }
  };

  // Função para salvar (lat/long fixos de Recife para teste)
  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Atenção", "Preencha título e descrição.");
      return;
    }
    
    try {
      await axios.post(API_URL, {
        title,
        description,
        latitude: -8.050000, 
        longitude: -34.900000,
        photo: null 
      });
      
      setTitle('');
      setDescription('');
      fetchPlaces(); // Atualiza a lista
      Alert.alert("Sucesso", "Local salvo!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Falha ao salvar o local.");
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const renderItem = ({ item }: { item: Place }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardCoords}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
      </View>
      <Text style={styles.cardDesc}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Diário de Viagem</Text>
      </View>

      <View style={styles.form}>
        <TextInput 
          style={styles.input} 
          placeholder="Nome do Local (ex: Torre Eiffel)" 
          value={title} 
          onChangeText={setTitle} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Descrição (ex: Vista incrível!)" 
          value={description} 
          onChangeText={setDescription} 
        />
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Salvar Local</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subTitle}>Locais Salvos ({places.length})</Text>

      <FlatList
        data={places}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum local salvo ainda.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { padding: 20, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  
  form: { padding: 20 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#4F46E5', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  subTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 10, color: '#555' },
  list: { paddingHorizontal: 20, paddingBottom: 50 },
  empty: { textAlign: 'center', marginTop: 20, color: '#999' },

  card: { backgroundColor: '#fff', padding: 15, marginBottom: 12, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardCoords: { fontSize: 12, color: '#888', alignSelf: 'center' },
  cardDesc: { color: '#666', fontSize: 14 }
});