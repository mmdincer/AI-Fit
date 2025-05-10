import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, XCircle, ArrowLeft, Crown, Star, RefreshCw } from 'lucide-react-native';
import Constants from 'expo-constants';

export default function SubscriptionScreen() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    setLoading(true);
    try {
      const status = await AsyncStorage.getItem('isPremium');
      setIsPremium(status === 'true');
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleSelectPlan = (planId: string) => {
    Alert.alert(
      `Plan Selected: ${planId}`,
      'Purchase flow integration is needed here.',
      [{ text: 'OK' }]
    );
  };

  const handleRestorePurchases = () => {
    Alert.alert('Restore Purchases', 'Restore purchase functionality needs to be implemented.');
  };

  const handleOpenURL = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`Can't open URL: ${url}`);
    }
  };

  const plans = {
    free: {
      title: 'Free',
      price: '$0',
      period: 'Limited',
      features: [
        { text: '3 Generations', included: true },
        { text: 'Standard Quality', included: true },
        { text: 'High Quality Mode', included: false },
        { text: 'Unlimited Generations', included: false },
      ],
    },
    basic: {
      title: 'Basic',
      price: '$9.99',
      period: 'month',
      features: [
        { text: '50 Generations / month', included: true },
        { text: 'Standard Quality', included: true },
        { text: 'High Quality Mode', included: false },
        { text: 'Unlimited Generations', included: false },
      ],
    },
    pro: {
      title: 'Pro',
      price: '$24.99',
      period: 'month',
      popular: true,
      features: [
        { text: '250 Generations / month', included: true },
        { text: 'Standard Quality', included: true },
        { text: 'High Quality Mode', included: true },
      ],
    }
  };

  const FeatureItem = ({ text, included }: { text: string, included: boolean }) => (
    <View style={styles.featureItem}>
      {included ? 
        <CheckCircle size={18} color="#34C759" style={styles.checkIcon} /> : 
        <XCircle size={18} color="#FF453A" style={styles.checkIcon} />
      }
      <Text style={[styles.featureText, !included && styles.featureTextExcluded]}>{text}</Text>
    </View>
  );

  if (loading) {
    return <View style={styles.container}><Text style={{color: '#000000'}}>Loading...</Text></View>;
  }

  const currentPlan = isPremium ? plans.pro : plans.free;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroSection}>
          <View style={[styles.iconContainer, isPremium && styles.premiumIconContainer]}>
            {isPremium ? <Crown size={28} color="#FFFFFF" /> : <Star size={28} color="#007AFF" />} 
          </View>
          <Text style={styles.heroTitle}>{isPremium ? 'You are Pro!' : 'Unlock Premium Features'}</Text>
          <Text style={styles.heroDescription}>
            {isPremium ? 'Enjoy unlimited generations and high quality mode.' : 'Upgrade your plan for more generations and features.'}
          </Text>
        </View>
        
        <View style={styles.plansContainer}>
          <View style={[styles.planCard, !isPremium && styles.selectablePlan]}>
            <Text style={styles.planTitle}>{plans.basic.title}</Text>
            <View style={styles.planPriceContainer}>
              <Text style={styles.planPrice}>{plans.basic.price}</Text>
              <Text style={styles.planPeriod}>/ {plans.basic.period}</Text>
            </View>
            <View style={styles.planFeatures}>
              {plans.basic.features.map((feature, index) => (
                <FeatureItem key={index} text={feature.text} included={feature.included} />
              ))}
            </View>
            {!isPremium && (
              <TouchableOpacity 
                style={styles.selectButton}
                onPress={() => handleSelectPlan('basic')}
              >
                <Text style={styles.selectButtonText}>Select Basic</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.planCard, styles.popularPlan, isPremium && styles.currentPlan]}>
            {plans.pro.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>RECOMMENDED</Text></View>}
            <Text style={styles.planTitle}>{plans.pro.title}</Text>
             <View style={styles.planPriceContainer}>
              <Text style={styles.planPrice}>{plans.pro.price}</Text>
              <Text style={styles.planPeriod}>/ {plans.pro.period}</Text>
            </View>
            <View style={styles.planFeatures}>
              {plans.pro.features.map((feature, index) => (
                <FeatureItem key={index} text={feature.text} included={feature.included} />
              ))}
            </View>
            {isPremium ? (
                <View style={styles.currentPlanIndicator}>
                   <CheckCircle size={16} color="#FFFFFF"/>
                   <Text style={styles.currentPlanText}>Current Plan</Text>
                </View>
            ) : (
              <TouchableOpacity 
                style={[styles.selectButton, styles.proButton]}
                onPress={() => handleSelectPlan('pro')}
              >
                 <Crown size={16} color="#FFFFFF" style={{marginRight: 5}}/>
                <Text style={styles.selectButtonText}>Select Pro</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
          <RefreshCw size={16} color="#555555" style={{marginRight: 8}}/>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <View style={styles.legalLinksContainer}>
            <TouchableOpacity onPress={() => handleOpenURL('https://example.com/terms')}>
                <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => handleOpenURL('https://example.com/privacy')}>
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
        </View>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Constants.statusBarHeight + 10,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  contentContainer: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  premiumIconContainer: {
      backgroundColor: '#007AFF',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  plansContainer: {
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectablePlan: {
    
  },
  popularPlan: {
    borderColor: '#007AFF',
    borderWidth: 2,
    position: 'relative',
  },
  currentPlan: {
      borderColor: '#007AFF',
      borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 15,
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 5,
  },
  planPriceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 15,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  planPeriod: {
    fontSize: 14,
    color: '#555555',
    marginLeft: 5,
  },
  planFeatures: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#EFEFF0',
  },
  featureTextExcluded: {
      color: '#8E8E93',
      textDecorationLine: 'line-through',
  },
  selectButton: {
    backgroundColor: '#3A3A3C',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  proButton: {
      backgroundColor: '#0A84FF',
  },
  currentPlanIndicator: {
      backgroundColor: '#34C759',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center'
  },
  currentPlanText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
      marginLeft: 8,
  },
  disclaimerText: {
      fontSize: 11,
      color: '#8E8E93',
      textAlign: 'center',
      marginTop: 15,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  restoreButtonText: {
    color: '#B0B0B0',
    fontSize: 14,
    fontWeight: '500',
  },
  legalLinksContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 25,
      marginBottom: 10,
  },
  legalLinkText: {
      color: '#8E8E93',
      fontSize: 12,
      textDecorationLine: 'underline',
  },
  legalSeparator: {
      color: '#8E8E93',
      fontSize: 12,
      marginHorizontal: 8,
  },
});