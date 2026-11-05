import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { WELCOME_DIM_FALLBACK, WELCOME_DIM_OPACITY } from './welcome_dim';
import { nextWelcomeAction, visibleReply, welcomeReplies, welcomeUi } from './welcomeCopy';

export type ApprovedWelcomeProps = Readonly<{
  homeBackdrop: React.ReactNode;
  selectedLanguage: string;
  /** Язык интерфейса: тексты и подписи кнопок. */
  lang?: Lang;
  active: boolean;
  reducedMotion: boolean;
  safeTop?: number;
  safeBottom?: number;
  /** Тон пелены (глубокий тёмный цвета темы); нет — фиолетовый одобренного превью. */
  dimColor?: string;
  onSkip(): void;
  onStart(): void;
}>;

const character = require('../../assets/images/onboarding/rev8/02-introduction.webp');
// Exact same SHA-256 as approved rev8 assets/coin-0.webp.
import { MyRankCoin } from '../rank/MyRankCoin'; // зачем (слово владельца 05.11): монета строго по рангу пользователя, не фиксированная базовая
const ease = Easing.bezier(.23,1,.32,1);

/** Presentational only: host owns activation, account state and destinations. */
export function ApprovedWelcome({homeBackdrop,selectedLanguage,lang='ru',active,reducedMotion,safeTop=0,safeBottom=0,dimColor=WELCOME_DIM_FALLBACK,onSkip,onStart}:ApprovedWelcomeProps){
  const {height,width}=useWindowDimensions();
  const [step,setStep]=useState(0);
  const [count,setCount]=useState(0);
  const [exiting,setExiting]=useState(false);
  const replies=useMemo(()=>welcomeReplies(selectedLanguage,lang),[selectedLanguage,lang]);
  const ui=useMemo(()=>welcomeUi(lang),[lang]);
  const reply=replies[step];
  const length=Array.from(reply.body).length;
  const hero=useRef(new Animated.Value(reducedMotion?1:0)).current;
  const halo=useRef(new Animated.Value(reducedMotion?1:0)).current;
  const speech=useRef(new Animated.Value(reducedMotion?1:0)).current;
  const exit=useRef(new Animated.Value(0)).current;
  const mounted=useRef(true);
  const started=useRef(false);
  const previousBody=useRef(reply.body);
  const startRef=useRef(onStart);startRef.current=onStart;
  const heroStyle=useMemo(()=>({opacity:Animated.multiply(hero,exit.interpolate({inputRange:[0,1],outputRange:[1,0]})),transform:[{translateX:hero.interpolate({inputRange:[0,1],outputRange:[-35,0]})},{scale:hero.interpolate({inputRange:[0,1],outputRange:[.9,1]})},{translateY:exit.interpolate({inputRange:[0,1],outputRange:[0,Math.min(height,680)]})}]}),[hero,exit,height]);
  const finishStart=()=>{if(mounted.current&&!started.current){started.current=true;startRef.current();}};

  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(!active){hero.stopAnimation();halo.stopAnimation();exit.stopAnimation();return;}
    if(reducedMotion){hero.setValue(1);halo.setValue(1);if(exiting){exit.setValue(1);finishStart();}return;}
    const animations=exiting
      ? [Animated.timing(exit,{toValue:1,duration:260,easing:ease,useNativeDriver:true})]
      : [Animated.timing(hero,{toValue:1,duration:850,easing:ease,useNativeDriver:true}),Animated.timing(halo,{toValue:1,duration:900,easing:ease,useNativeDriver:true})];
    const group=Animated.parallel(animations);
    group.start(({finished})=>{if(finished&&exiting)finishStart();});
    return ()=>group.stop();
  },[active,reducedMotion,exiting,hero,halo,exit]);
  useLayoutEffect(()=>{
    speech.stopAnimation();
    if(!active)return;
    const changed=previousBody.current!==reply.body;previousBody.current=reply.body;
    if(reducedMotion){speech.setValue(1);setCount(length);return;}
    speech.setValue(0);if(changed)setCount(0);
    const animation=Animated.timing(speech,{toValue:1,duration:220,easing:ease,useNativeDriver:true});animation.start();
    return ()=>animation.stop();
  },[step,reply.body,active,reducedMotion,length,speech]);
  useEffect(()=>{
    if(!active||reducedMotion||exiting||count>=length)return;
    const timer=setTimeout(()=>setCount(value=>Math.min(value+1,length)),20);
    return ()=>clearTimeout(timer);
  },[active,reducedMotion,exiting,count,length]);

  const text=visibleReply(reply,count);
  const coinPosition=reply.coinAfter;
  const showCoin=coinPosition!==null&&count>=coinPosition;
  const advance=()=>{if(exiting||!active)return;const next=nextWelcomeAction(step);if(next.start)setExiting(true);else setStep(next.step);};
  return <View style={styles.root} accessibilityViewIsModal={active}>
    <View style={StyleSheet.absoluteFill} pointerEvents={active?'none':'auto'} accessibilityElementsHidden={active} importantForAccessibility={active?'no-hide-descendants':'auto'}>{homeBackdrop}</View>
    {active&&<>
    {/* зачем (владелец 05.11, «96 без свечения»): плотная пелена тона темы вместо блюра и полупрозрачного градиента; свечения за Лингман нет */}
    <View testID="welcome-dim" style={[StyleSheet.absoluteFill,{backgroundColor:dimColor,opacity:WELCOME_DIM_OPACITY}]} pointerEvents="none" />
    <View style={[styles.top,{paddingTop:safeTop+8}]}><Pressable accessibilityRole="button" accessibilityLabel={ui.skip} onPress={onSkip} disabled={exiting} style={styles.skip}><Text style={styles.skipText}>{ui.skip}</Text></Pressable></View>
    <View style={[styles.composition,{minHeight:Math.min(420,Math.max(0,height-safeTop-safeBottom-155))}]}>
      <Animated.View testID="welcome-character" style={[styles.characterStage,heroStyle]}>
        <Image source={character} resizeMode="contain" style={{width:Math.min(213,width*.64),height:Math.min(520,height*.64),transform:[{translateX:10}]}} accessibilityIgnoresInvertColors accessibilityLabel={ui.character} />
      </Animated.View>
      <Animated.View style={[styles.speech,{opacity:speech,transform:[{translateY:speech.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}]}>
        {reply.title?<Text style={styles.title}>{reply.title}</Text>:null}
        <Pressable accessibilityRole="button" accessibilityLabel={ui.showAll} onPress={()=>setCount(length)}><Text style={styles.body}>{showCoin?<>{text.slice(0,coinPosition)}<MyRankCoin testID="welcome-inline-coin" style={styles.coin} accessibilityElementsHidden />{text.slice(coinPosition)}</>:text}</Text></Pressable>
      </Animated.View>
    </View>
    <View style={[styles.footer,{paddingBottom:safeBottom+20}]}>
      <View style={styles.dots} accessibilityElementsHidden>{[0,1,2].map(index=><View key={index} style={[styles.dot,index<=step&&styles.dotDone]} />)}</View>
      <Pressable accessibilityRole="button" disabled={exiting} onPress={advance} style={styles.primary}><Text style={styles.primaryText}>{step===2?ui.start:ui.next}</Text></Pressable>
      <Text style={styles.hint}>{ui.hint}</Text>
    </View>
    </>}
  </View>;
}

const styles=StyleSheet.create({
  root:{...StyleSheet.absoluteFillObject,justifyContent:'space-between'},top:{alignItems:'flex-end',paddingHorizontal:20},skip:{minHeight:48,justifyContent:'center',paddingHorizontal:14,borderRadius:18,backgroundColor:'#ffffff18'},skipText:{fontSize:13,color:'#fff'},
  composition:{flex:1,flexDirection:'row',alignItems:'center',paddingRight:24},characterStage:{width:'41%',alignItems:'center',justifyContent:'center',alignSelf:'stretch'},
  speech:{width:'59%',paddingLeft:8,paddingVertical:20,alignSelf:'center'},title:{fontSize:26,lineHeight:30.16,fontWeight:'800',letterSpacing:-.6,marginTop:12,marginBottom:16,color:'#fff',textShadowColor:'#0008',textShadowRadius:18,textShadowOffset:{width:0,height:2}},body:{fontSize:17,lineHeight:25.5,minHeight:230,color:'#fff',textShadowColor:'#0008',textShadowRadius:10,textShadowOffset:{width:0,height:1}},coin:{width:25,height:25},
  footer:{paddingHorizontal:20},dots:{flexDirection:'row',gap:7,marginVertical:20},dot:{flex:1,height:4,borderRadius:4,backgroundColor:'#ffffff3b'},dotDone:{backgroundColor:'#fff'},primary:{height:52,borderRadius:26,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},primaryText:{color:'#181c24',fontSize:16,fontWeight:'700'},hint:{textAlign:'center',color:'#ffffffb8',fontSize:11,marginTop:14},
});
