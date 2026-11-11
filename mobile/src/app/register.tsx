import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Link, Redirect, useRouter } from 'expo-router'
import { Alert, Button, Input, Logo, Screen } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { colors } from '@/theme'
import { isValidCpf, maskCpf, onlyDigits } from '@/utils/cpf'
import { dateBrToIso, maskDateBr } from '@/utils/format'

// Primeiro acesso do paciente (docs/API_CONTRACT.md, seção 5.2).
// CPF + data de nascimento precisam bater com o prontuário criado pelo médico
// no primeiro atendimento. A senha exige 8–64 caracteres com letras e números.

const PASSWORD_RULE =
  'Entre 8 e 64 caracteres, com letras e números. Não use uma senha comum nem partes do seu CPF.'

export default function Register() {
  const router = useRouter()
  const { user, registerPatient } = useAuth()
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Redirect href="/(tabs)/carteira" />

  function validate(localError: (message: string) => void): void {
    if (onlyDigits(cpf).length !== 11) return localError('Informe os 11 dígitos do seu CPF.')
    if (!isValidCpf(cpf)) return localError('CPF inválido. Confira os dígitos.')
    if (birthDate.length !== 10) return localError('Informe a data de nascimento completa (dd/mm/aaaa).')
    const iso = dateBrToIso(birthDate)
    if (!iso) return localError('Data de nascimento inválida.')
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password)) return localError(PASSWORD_RULE)
    if (password !== confirm) return localError('As senhas não conferem.')
  }

  async function handleSubmit() {
    Keyboard.dismiss()
    setError('')
    let invalid = ''
    validate((message) => {
      invalid = message
    })
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    try {
      await registerPatient({ cpf, birthDate: dateBrToIso(birthDate) ?? '', password })
      // Registrado e com sessão ativa: entra direto no app
      router.replace('/(tabs)/carteira')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
      setBusy(false)
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo size={20} />
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>
              Use o CPF e a data de nascimento informados no seu primeiro atendimento.
            </Text>
          </View>

          {error ? <Alert tone="error">{error}</Alert> : <Alert tone="info">{PASSWORD_RULE}</Alert>}

          <View style={styles.form}>
            <Input
              label="CPF"
              value={cpf}
              onChangeText={(v) => setCpf(maskCpf(v))}
              keyboardType="number-pad"
              maxLength={14}
              placeholder="000.000.000-00"
              autoComplete="off"
              returnKeyType="next"
            />
            <Input
              label="Data de nascimento"
              value={birthDate}
              onChangeText={(v) => setBirthDate(maskDateBr(v))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="dd/mm/aaaa"
              autoComplete="off"
              returnKeyType="next"
            />
            <Input
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="off"
              maxLength={64}
              placeholder="Sua senha"
              returnKeyType="next"
            />
            <Input
              label="Confirmar senha"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="off"
              maxLength={64}
              placeholder="Repita a senha"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <Button label={busy ? 'Criando conta...' : 'Criar conta'} full size="lg" busy={busy} onPress={handleSubmit} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <Link href="/login" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>Entrar</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  header: { alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: colors.slate[900], letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.slate[600], textAlign: 'center', lineHeight: 20 },
  form: { gap: 16, marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  footerText: { fontSize: 14, color: colors.slate[600] },
  footerLink: { fontSize: 14, fontWeight: '600', color: colors.brand[700] },
})
